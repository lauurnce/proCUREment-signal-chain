import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type ComposedEmail,
  composeEmail,
  type MailDriverId,
  type MailOverview,
  type MailRef,
  type MailStatus,
  SentEntry,
} from "@hq/shared";
import { toMarkdown } from "@hq/shared/vault";
import { z } from "zod";
import { NOT_CONNECTED, type OutlookAuth, SignInError } from "../auth/outlook";
import { logLine, manilaIso } from "../vault/decide";
import type { VaultStore } from "../vault/store";
import { readRecord, writeAtomic } from "../vault/write";
import type { MailConfig } from "./config";
import { buildEml, MailError } from "./eml";
import { GraphAuthError, type GraphClient, GraphNotFoundError } from "./graph";
import { checkSend, redirectBanner, type SendCheck, sameRecipients } from "./guard";

const PA_NOT_SET_UP =
  "The Power Automate bridge is not set up. It needs ADI IT approval first, so no draft was made.";
const GONE = "The draft is not in Outlook any more. Make the draft again.";

/** Sends, the hourly count and later the digest, in the vault's hidden .state/ folder. */
const LEDGER = ".state/mail.json";
const Ledger = z.object({ sends: z.array(SentEntry) });
const HOUR = 3_600_000;
const clock = (at: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);

export type SendCheckResult =
  | { ok: true; to: string[]; redirectedFrom?: string[] }
  | { ok: false; error: string };

/**
 * Mail is a side effect of a saved decision (D-120). Approving an email item makes one draft
 * through the driver in use, and records it in the item's frontmatter as `mail:`. Sending is a
 * separate click that must pass every rule in guard.ts, checked here on the server.
 */
export class MailService {
  readonly #config: MailConfig;
  readonly #store: VaultStore;
  readonly #auth: OutlookAuth | null;
  readonly #graph: GraphClient | null;

  constructor(deps: {
    config: MailConfig;
    store: VaultStore;
    auth?: OutlookAuth | null;
    graph?: GraphClient | null;
  }) {
    this.#config = deps.config;
    this.#store = deps.store;
    this.#auth = deps.auth ?? null;
    this.#graph = deps.graph ?? null;
  }

  get auth(): OutlookAuth | null {
    return this.#auth;
  }

  /** The driver in use now. Demo Day always uses the outbox inside vault-demo/ (D-120). */
  driver(): MailDriverId {
    const { provider } = this.#config;
    if (this.#store.demo) return "outbox";
    if (provider === "graph") return this.#auth && this.#graph ? "graph" : "outbox";
    return provider;
  }

  status(): MailStatus {
    const c = this.#config;
    const driver = this.driver();
    const auth = this.#auth;
    const connected = driver === "graph" && Boolean(auth?.connected);
    const problems = [...c.problems];
    if (this.#store.demo) {
      problems.push("Demo Day is on, so drafts are saved as files in vault-demo/.");
    } else if (c.provider === "graph" && !auth) {
      problems.push("MS_CLIENT_ID is not set, so drafts are saved as .eml files.");
    } else if (driver === "graph" && auth?.problem) {
      problems.push(auth.problem);
    } else if (c.provider === "power-automate") {
      problems.push(PA_NOT_SET_UP);
    }
    const safeList = c.redirectTo ? c.allowed.includes(c.redirectTo) : c.allowed.length > 0;
    return {
      driver,
      configured: c.provider,
      mode: c.mode,
      connected,
      account: driver === "graph" ? (auth?.account ?? null) : null,
      sendReady: connected && c.mode === "send" && safeList,
      redirectTo: c.redirectTo,
      allowlistCount: c.allowed.length,
      maxPerHour: c.maxPerHour,
      problem: problems.length ? problems.join(" ") : null,
      cacheWarning: driver === "graph" ? (auth?.cacheWarning ?? null) : null,
    };
  }

  async overview(): Promise<MailOverview> {
    const c = this.#config;
    const sends = (await this.#ledger()).sends;
    return {
      status: this.status(),
      sent: sends.slice(-20).reverse(),
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
    if (item.status !== "approved") {
      return { error: `Approve ${id} first. The draft is made then.` };
    }
    if (item.mail && item.mail.state !== "failed") {
      return { error: `${id} already has a draft. One approval makes one draft.` };
    }
    return { line: await this.#draft(id, item.file, at) };
  }

  /** With MAIL_REDIRECT_TO, an Outlook draft goes to you, with a banner (skill, rule 4). */
  #redirected(email: ComposedEmail): { email: ComposedEmail; from?: string[] } {
    const to = this.#config.redirectTo;
    if (!to) return { email };
    const original = [...email.to, ...email.cc];
    return {
      email: { ...email, to: [to], cc: [], text: `${redirectBanner(original)}\n\n${email.text}` },
      from: original,
    };
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
      if (!email) {
        throw new MailError(`${id} has no "## Draft email" section, so no draft was made.`);
      }
      if (driver === "power-automate") throw new MailError(PA_NOT_SET_UP);
      if (driver === "graph") {
        const { email: out, from } = this.#redirected(email);
        const to = [...out.to, ...out.cc];
        const redirectedFrom = from ? { redirectedFrom: from } : {};
        if (this.#config.mode === "dry-run") {
          ref = { driver, state: "dry-run", to, createdAt, ...redirectedFrom };
          text = `mail: dry run for ${id} (graph), nothing created, to ${to.join(", ")}`;
        } else {
          const draft = await this.#withGraph((g) => g.createDraft(out));
          ref = {
            driver,
            state: "draft",
            to,
            draftId: draft.id,
            ...(draft.webLink ? { webLink: draft.webLink } : {}),
            createdAt,
            ...redirectedFrom,
          };
          text = `mail: draft for ${id} (graph) in your Outlook Drafts, to ${to.join(", ")}${from ? ` (redirected from ${from.join(", ")})` : ""}`;
        }
      } else {
        const to = [...email.to, ...email.cc];
        if (this.#config.mode === "dry-run") {
          ref = { driver, state: "dry-run", to, createdAt };
          text = `mail: dry run for ${id} (${driver}), nothing created, to ${to.join(", ")}`;
        } else {
          const out = `outbox/${id}.eml`;
          await writeAtomic(vaultDir, out, buildEml(email, at));
          ref = { driver, state: "draft", to, file: out, createdAt };
          text = `mail: draft for ${id} (${driver}) saved as ${out}, to ${to.join(", ")}`;
        }
      }
    } catch (error) {
      const problem = plain(error, "The draft could not be saved. Try again.");
      ref = { driver, state: "failed", to: email?.to ?? [], createdAt, problem };
      text = `mail: draft for ${id} failed (${driver}): ${problem}`;
    }
    await writeAtomic(vaultDir, file, toMarkdown({ ...record.data, mail: ref }, record.body));
    return logLine(vaultDir, at, text);
  }

  /** Runs a Graph call. A 401 after a refresh means: sign in again. */
  async #withGraph<T>(call: (graph: GraphClient) => Promise<T>): Promise<T> {
    if (!this.#graph || !this.#auth?.connected) throw new MailError(NOT_CONNECTED);
    try {
      return await call(this.#graph);
    } catch (error) {
      if (error instanceof GraphAuthError) this.#auth.expire();
      throw error;
    }
  }

  /**
   * Step 1 of Send now: reads the draft's recipients again from Outlook (you may have edited
   * it there) and checks every rule. The confirm dialog shows exactly these recipients.
   */
  async sendCheck(id: string, now = new Date()): Promise<SendCheckResult> {
    const item = this.#store.state.queue.find((q) => q.id === id);
    const mail = item?.mail;
    if (!item?.file || !mail) return { ok: false, error: `${id} has no draft yet.` };
    if (mail.state === "sent") return { ok: false, error: `${id} was already sent.` };
    const base = await this.#guardInput(now);
    if (mail.state !== "draft" || mail.driver !== "graph" || !mail.draftId) {
      // Let the guard explain (Demo Day, the outbox, not connected, mode), else a general reason.
      const first = checkSend({ ...base, recipients: mail.to, text: "" });
      return first.ok ? { ok: false, error: `${id} has no Outlook draft to send.` } : first;
    }
    const draftId = mail.draftId;
    // The rules that do not depend on the recipients come first, before asking Outlook.
    // ("Not sent." messages are about recipients, the limit or the text: checked below.)
    const pre = checkSend({ ...base, recipients: mail.to, text: "" });
    if (!pre.ok && !pre.error.startsWith("Not sent.")) return pre;
    let recipients: string[];
    try {
      recipients = await this.#withGraph((g) => g.recipients(draftId));
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        await this.#markFailed(item.file, GONE);
        return { ok: false, error: GONE };
      }
      return { ok: false, error: plain(error, "Could not check the draft in Outlook.") };
    }
    const email = composeEmail(item);
    const check: SendCheck = checkSend({ ...base, recipients, text: email?.text ?? "" });
    if (!check.ok) return check;
    return {
      ok: true,
      to: check.to,
      ...(mail.redirectedFrom ? { redirectedFrom: mail.redirectedFrom } : {}),
    };
  }

  /**
   * Step 2: sends the draft, only if every rule still passes and the recipients are the ones
   * you confirmed. Logs the send and records it in the ledger.
   */
  async send(
    id: string,
    confirmed: string[],
    now = new Date(),
  ): Promise<{ line: string } | { error: string }> {
    const check = await this.sendCheck(id, now);
    if (!check.ok) return { error: check.error };
    if (!sameRecipients(check.to, confirmed)) {
      return { error: "The recipients changed since you checked. Please look at the list again." };
    }
    const item = this.#store.state.queue.find((q) => q.id === id);
    const mail = item?.mail;
    if (!item?.file || !mail?.draftId) return { error: `${id} has no Outlook draft to send.` };
    const draftId = mail.draftId;
    try {
      await this.#withGraph((g) => g.send(draftId));
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        await this.#markFailed(item.file, GONE);
        return { error: GONE };
      }
      const problem = plain(error, "Outlook did not send it. Try again.");
      await logLine(this.#store.vaultDir, now, `mail: send of ${id} failed (graph): ${problem}`);
      return { error: problem };
    }
    const at = manilaIso(now);
    const record = await readRecord(this.#store.vaultDir, item.file);
    await writeAtomic(
      this.#store.vaultDir,
      item.file,
      toMarkdown({ ...record.data, mail: { ...mail, state: "sent", sentAt: at } }, record.body),
    );
    const entry: SentEntry = {
      at,
      itemId: id,
      subject: item.email?.subject ?? item.title,
      to: check.to,
      driver: "graph",
      ...(mail.redirectedFrom ? { redirectedFrom: mail.redirectedFrom } : {}),
    };
    const ledger = await this.#ledger();
    await writeAtomic(
      this.#store.vaultDir,
      LEDGER,
      `${JSON.stringify({ sends: [...ledger.sends, entry].slice(-200) }, null, 2)}\n`,
    );
    const line = await logLine(
      this.#store.vaultDir,
      now,
      `mail: sent ${id} (graph) to ${check.to.join(", ")}${mail.redirectedFrom ? ` (redirected from ${mail.redirectedFrom.join(", ")})` : ""}`,
    );
    return { line };
  }

  async #guardInput(now: Date) {
    const c = this.#config;
    const hourAgo = now.getTime() - HOUR;
    const recent = (await this.#ledger()).sends
      .map((s) => Date.parse(s.at))
      .filter((t) => t > hourAgo)
      .sort((a, b) => a - b);
    const oldest = recent[0];
    return {
      demo: Boolean(this.#store.demo),
      driver: this.driver(),
      connected: Boolean(this.#auth?.connected),
      mode: c.mode,
      allowed: c.allowed,
      redirectTo: c.redirectTo,
      maxPerHour: c.maxPerHour,
      sendsThisHour: recent.length,
      nextFreeAt: oldest === undefined ? null : clock(new Date(oldest + HOUR)),
    };
  }

  async #ledger(): Promise<z.infer<typeof Ledger>> {
    try {
      const text = await readFile(join(this.#store.vaultDir, LEDGER), "utf8");
      const parsed = Ledger.safeParse(JSON.parse(text));
      return parsed.success ? parsed.data : { sends: [] };
    } catch {
      return { sends: [] };
    }
  }

  async #markFailed(file: string, problem: string) {
    const record = await readRecord(this.#store.vaultDir, file);
    const mail = record.data.mail as MailRef | undefined;
    if (!mail) return;
    await writeAtomic(
      this.#store.vaultDir,
      file,
      toMarkdown({ ...record.data, mail: { ...mail, state: "failed", problem } }, record.body),
    );
  }
}

/** A plain-English message for an error, never a stack or a token. */
function plain(error: unknown, fallback: string): string {
  return error instanceof MailError || error instanceof SignInError ? error.message : fallback;
}
