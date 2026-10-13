import {
  composeEmail,
  type MailDriverId,
  type MailOverview,
  type MailRef,
  type MailStatus,
} from "@hq/shared";
import { toMarkdown } from "@hq/shared/vault";
import { logLine, manilaIso } from "../vault/decide";
import type { VaultStore } from "../vault/store";
import { readRecord, writeAtomic } from "../vault/write";
import type { MailConfig } from "./config";
import { buildEml, MailError } from "./eml";

const PA_NOT_SET_UP =
  "The Power Automate bridge is not set up. It needs ADI IT approval first, so no draft was made.";

/**
 * Mail is a side effect of a saved decision (D-120). Approving an email item makes one draft
 * through the driver in use, and records it in the item's frontmatter as `mail:`. Nothing here
 * sends: sending is a separate, guarded step (P7.3).
 */
export class MailService {
  readonly #config: MailConfig;
  readonly #store: VaultStore;

  constructor(deps: { config: MailConfig; store: VaultStore }) {
    this.#config = deps.config;
    this.#store = deps.store;
  }

  /** The driver in use now. Demo Day always uses the outbox inside vault-demo/ (D-120). */
  driver(): MailDriverId {
    const { provider } = this.#config;
    if (this.#store.demo) return "outbox";
    // The Outlook sign-in comes in P7.3. Until then, graph falls back to the outbox.
    if (provider === "graph") return "outbox";
    return provider;
  }

  status(): MailStatus {
    const c = this.#config;
    const driver = this.driver();
    const problems = [...c.problems];
    if (this.#store.demo)
      problems.push("Demo Day is on, so drafts are saved as files in vault-demo/.");
    else if (c.provider === "graph") {
      problems.push(
        c.msClientId
          ? "Outlook sign-in is not built yet, so drafts are saved as .eml files for now."
          : "MS_CLIENT_ID is not set, so drafts are saved as .eml files.",
      );
    } else if (c.provider === "power-automate") problems.push(PA_NOT_SET_UP);
    return {
      driver,
      configured: c.provider,
      mode: c.mode,
      connected: false,
      account: null,
      sendReady: false,
      redirectTo: c.redirectTo,
      allowlistCount: c.allowed.length,
      maxPerHour: c.maxPerHour,
      problem: problems.length ? problems.join(" ") : null,
    };
  }

  overview(): MailOverview {
    const c = this.#config;
    return {
      status: this.status(),
      digest: { time: c.digestTime, timezone: c.timezone, hasRecipient: Boolean(c.digestTo) },
      inboxTag: c.inboxTag,
    };
  }

  /**
   * After you approve an item: makes its draft once. Returns the log line, or null when the item
   * is not an email or already has a draft (one approval, one draft, D-119).
   */
  async afterApprove(id: string, at = new Date()): Promise<string | null> {
    const item = this.#store.state.queue.find((q) => q.id === id);
    if (!item?.file || item.kind !== "email-draft" || !item.email) return null;
    if (item.mail && item.mail.state !== "failed") return null;
    return this.#draft(id, item.file, at);
  }

  /** "Make the draft again": only for an approved email item whose draft failed (D-119). */
  async redraft(id: string, at = new Date()): Promise<{ line: string } | { error: string }> {
    const item = this.#store.state.queue.find((q) => q.id === id);
    if (!item?.file || item.kind !== "email-draft" || !item.email) {
      return { error: `${id} is not an email item.` };
    }
    if (item.status !== "approved")
      return { error: `Approve ${id} first. The draft is made then.` };
    if (item.mail && item.mail.state !== "failed") {
      return { error: `${id} already has a draft. One approval makes one draft.` };
    }
    return { line: await this.#draft(id, item.file, at) };
  }

  async #draft(id: string, file: string, at: Date): Promise<string> {
    const vaultDir = this.#store.vaultDir;
    const record = await readRecord(vaultDir, file);
    const item = this.#store.state.queue.find((q) => q.id === id);
    const driver = this.driver();
    const createdAt = manilaIso(at);
    const email = item ? composeEmail(item) : null;
    let ref: MailRef;
    let text: string;
    try {
      if (!email)
        throw new MailError(`${id} has no "## Draft email" section, so no draft was made.`);
      const to = [...email.to, ...email.cc];
      if (this.#config.mode === "dry-run") {
        ref = { driver, state: "dry-run", to, createdAt };
        text = `mail: dry run for ${id} (${driver}), nothing created, to ${to.join(", ")}`;
      } else if (driver === "power-automate") {
        throw new MailError(PA_NOT_SET_UP);
      } else {
        const out = `outbox/${id}.eml`;
        await writeAtomic(vaultDir, out, buildEml(email, at));
        ref = { driver, state: "draft", to, file: out, createdAt };
        text = `mail: draft for ${id} (${driver}) saved as ${out}, to ${to.join(", ")}`;
      }
    } catch (error) {
      const problem =
        error instanceof MailError ? error.message : "The draft could not be saved. Try again.";
      ref = { driver, state: "failed", to: email?.to ?? [], createdAt, problem };
      text = `mail: draft for ${id} failed (${driver}): ${problem}`;
    }
    await writeAtomic(vaultDir, file, toMarkdown({ ...record.data, mail: ref }, record.body));
    return logLine(vaultDir, at, text);
  }
}
