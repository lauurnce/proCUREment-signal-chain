import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type ComposedEmail,
  composeEmail,
  type MailDriverId,
  type MailOverview,
  type MailRef,
  type MailStatus,
  type SentEntry,
  type Task,
} from "@hq/shared";
import { toMarkdown } from "@hq/shared/vault";
import { NOT_CONNECTED, type OutlookAuth, SignInError } from "../auth/outlook";
import { logLine, manilaIso } from "../vault/decide";
import type { VaultStore } from "../vault/store";
import { readRecord, writeAtomic } from "../vault/write";
import type { MailConfig } from "./config";
import { buildDigest } from "./digest";
import { buildEml, MailError } from "./eml";
import { GraphAuthError, type GraphClient, GraphNotFoundError } from "./graph";
import { checkSend, redirectBanner, type SendCheck, sameRecipients } from "./guard";
import { type InboxRules, nextTaskId, pickOwner, routeEmail, taskTitle } from "./inbox";
import { type Ledger, readLedger, writeLedger } from "./ledger";

const PA_NOT_SET_UP =
  "The Power Automate bridge is not set up. It needs IT approval first, so no draft was made.";
const GONE = "The draft is not in Outlook any more. Make the draft again.";
const DIGEST_TO_MISSING =
  "DIGEST_TO is not set, so the digest has no one to go to. Set DIGEST_TO in .env and restart pnpm dev.";
const DIGEST_FONT = "'Quattrocento Sans', Arial, Helvetica, sans-serif";

const HOUR = 3_600_000;
/** How long a helper stays at the Mail Dock for an [HQ] email. */
const VISIT_MS = 5 * 60_000;
const MAIL_DOCK = "mail-dock";
const dayIn = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
/** "2:05 PM", the app's time format (adi-theme skill). */
const clock12 = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(at);
const timeIn = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(at);
const longDayIn = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at);
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
    inboxRules?: InboxRules;
  }) {
    this.#config = deps.config;
    this.#store = deps.store;
    this.#auth = deps.auth ?? null;
    this.#graph = deps.graph ?? null;
    this.#rules = deps.inboxRules ?? {
      version: 1,
      rules: [],
      default: { track: "OPS", workflow: "ops-pr-to-po-stock-item" },
    };
  }

  readonly #rules: InboxRules;
  #lastInboxPoll = 0;
  /** One send at a time, so two quick clicks cannot both pass the hourly limit. */
  #queue: Promise<unknown> = Promise.resolve();

  #exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.#queue.then(work, work);
    this.#queue = run.catch(() => undefined);
    return run;
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
      // Only once you are signed in: before that, nothing is kept anywhere.
      cacheWarning: connected ? (auth?.cacheWarning ?? null) : null,
    };
  }

  async overview(): Promise<MailOverview> {
    const c = this.#config;
    const ledger = await readLedger(this.#store.vaultDir);
    const status = this.status();
    return {
      status,
      sent: ledger.sends.slice(-20).reverse(),
      digest: {
        time: c.digestTime,
        timezone: c.timezone,
        hasRecipient: Boolean(c.digestTo),
        lastAt: ledger.digest.lastAt,
        sends: this.digestSends(),
      },
      inbox: {
        tag: c.inboxTag,
        pollSeconds: c.inboxPollSeconds,
        active: status.driver === "graph" && status.connected,
        lastCheck: ledger.inbox.lastCheck,
      },
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
  send(
    id: string,
    confirmed: string[],
    now = new Date(),
  ): Promise<{ line: string } | { error: string }> {
    return this.#exclusive(() => this.#send(id, confirmed, now));
  }

  async #send(
    id: string,
    confirmed: string[],
    now: Date,
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
      // Set the recipients to exactly the confirmed list right before sending, so an edit made
      // in Outlook after the check cannot add anyone.
      await this.#withGraph(async (g) => {
        await g.setRecipients(draftId, check.to);
        await g.send(draftId);
      });
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
    const ledger = await readLedger(this.#store.vaultDir);
    await writeLedger(this.#store.vaultDir, { ...ledger, sends: [...ledger.sends, entry] });
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
    const recent = (await readLedger(this.#store.vaultDir)).sends
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

  /**
   * The clock, every 30 s from main.ts: helpers walk back from the Mail Dock, the inbox is
   * checked every HQ_INBOX_POLL_SECONDS, and the digest is made once a day at DIGEST_TIME. The
   * scheduled digest is only ever a draft or a file: nothing is sent without a click (D-127).
   * Nothing runs in Demo Day. Returns the new log lines, and whether any vault file changed.
   */
  async tick(now = new Date()): Promise<{ lines: string[]; changed: boolean }> {
    if (this.#store.demo) return { lines: [], changed: false };
    const lines: string[] = [];
    const walkedBack = await this.endVisits(now);
    if (now.getTime() - this.#lastInboxPoll >= this.#config.inboxPollSeconds * 1000) {
      this.#lastInboxPoll = now.getTime();
      lines.push(...(await this.checkInbox(now).catch(() => [])));
    }
    const c = this.#config;
    const ledger = await readLedger(this.#store.vaultDir);
    const today = dayIn(now, c.timezone);
    const due = timeIn(now, c.timezone) >= c.digestTime && ledger.digest.lastDate !== today;
    // An Outlook that is not connected waits: the digest goes once you connect, the same day.
    const waiting = this.driver() === "graph" && !this.#auth?.connected;
    if (due && !waiting) {
      const result = await this.makeDigest(now, { scheduled: true });
      if ("line" in result) lines.push(result.line);
      else {
        const fresh = await readLedger(this.#store.vaultDir);
        await writeLedger(this.#store.vaultDir, {
          ...fresh,
          digest: { ...fresh.digest, lastDate: today },
        });
        lines.push(
          await logLine(
            this.#store.vaultDir,
            now,
            `mail: the daily digest did not go out: ${result.error}`,
          ),
        );
      }
    }
    return { lines, changed: walkedBack > 0 || lines.length > 0 };
  }

  /**
   * Inbox to task (skill, section 5). Lists the newest inbox emails with only id, subject, sender
   * and time. Only an email whose subject starts with HQ_INBOX_TAG has its body opened. Each new
   * one becomes a Board task for the least busy helper of its track, and that helper walks to the
   * Mail Dock. Outlook only, never in Demo Day.
   */
  async checkInbox(now = new Date()): Promise<string[]> {
    if (this.#store.demo || this.driver() !== "graph" || !this.#auth?.connected) return [];
    const c = this.#config;
    const vaultDir = this.#store.vaultDir;
    const ledger = await readLedger(vaultDir);
    const tag = c.inboxTag.toLowerCase();
    const seen = new Set(ledger.inbox.seen);
    // The first check only looks back one day, so old tagged emails do not flood the Board.
    const since = Date.parse(ledger.inbox.lastCheck ?? "") || now.getTime() - 24 * HOUR;
    const messages = await this.#withGraph((g) => g.listInbox());
    // Only you, or an address on your allowed list, can make a task: a stranger who guesses the
    // tag cannot fill the Board.
    const trusted = new Set([...c.allowed, (this.#auth?.account ?? "").toLowerCase()]);
    const fresh = messages
      .filter((m) => m.subject.trim().toLowerCase().startsWith(tag))
      .filter((m) => trusted.has(m.from.trim().toLowerCase()))
      .filter((m) => !seen.has(m.id) && Date.parse(m.receivedAt) >= since - 5 * 60_000)
      .reverse();

    const lines: string[] = [];
    const tasks: Task[] = [...this.#store.state.tasks];
    for (const message of fresh) {
      seen.add(message.id);
      const body = await this.#withGraph((g) => g.body(message.id)).catch(() => "");
      const route = routeEmail(this.#rules, `${message.subject}\n${body}`);
      const owner = pickOwner(this.#store.state.seats, tasks, route.track);
      if (!owner) continue;
      const id = nextTaskId(tasks);
      const title = taskTitle(message.subject.trim(), c.inboxTag);
      const created = manilaIso(now);
      const excerpt = body.trim().slice(0, 800);
      const task: Task = {
        id,
        title,
        owner: owner.id,
        workflow: route.workflow,
        status: "todo",
        created,
        due: dayIn(now, c.timezone),
        links: [],
        body: [
          "## From your inbox",
          `Received ${clock12(new Date(message.receivedAt), c.timezone)}, from ${message.from || "an unknown sender"}.`,
          "",
          ...(excerpt ? excerpt.split("\n").map((l) => `> ${l}`) : ["> (No text in the email.)"]),
          "",
          "## Notes",
          `Made from an email tagged ${c.inboxTag}. The full email stays in Outlook.`,
        ].join("\n"),
      };
      const { body: taskBody, ...data } = task;
      await writeAtomic(vaultDir, `board/${id}.md`, toMarkdown(data, taskBody));
      tasks.push(task);
      await this.#visit(owner.id, now, ledger);
      lines.push(
        await logLine(
          vaultDir,
          now,
          `mail: ${c.inboxTag} email "${title}" became ${id} for the ${owner.displayName} helper`,
        ),
      );
    }
    await writeLedger(vaultDir, {
      ...ledger,
      inbox: { lastCheck: manilaIso(now), seen: [...seen] },
    });
    return lines;
  }

  /** Sends the helper to the Mail Dock for a while (the `visiting` field on its live status). */
  async #visit(seat: string, now: Date, ledger: Ledger) {
    const file = `team/${seat}/profile.md`;
    const record = await readRecord(this.#store.vaultDir, file).catch(() => null);
    if (!record) return;
    const status = record.data.status;
    const previous = typeof record.data.workingOn === "string" ? record.data.workingOn : undefined;
    await writeAtomic(
      this.#store.vaultDir,
      file,
      toMarkdown(
        {
          ...record.data,
          status: status === "off-duty" || status === "on-break" ? "working" : status,
          workingOn: `Reading an ${this.#config.inboxTag} email at the Mail Dock`,
          visiting: MAIL_DOCK,
          updated: manilaIso(now),
        },
        record.body,
      ),
    );
    ledger.visits = [
      ...ledger.visits.filter((v) => v.seat !== seat),
      { seat, until: now.getTime() + VISIT_MS, ...(previous ? { workingOn: previous } : {}) },
    ];
  }

  /** Helpers whose Mail Dock visit is over walk back to their desks. Returns how many. */
  async endVisits(now = new Date()): Promise<number> {
    const vaultDir = this.#store.vaultDir;
    const ledger = await readLedger(vaultDir);
    const over = ledger.visits.filter((v) => v.until <= now.getTime());
    if (over.length === 0) return 0;
    for (const visit of over) {
      const file = `team/${visit.seat}/profile.md`;
      const record = await readRecord(vaultDir, file).catch(() => null);
      if (!record || record.data.visiting !== MAIL_DOCK) continue;
      const { visiting: _gone, ...data } = record.data;
      await writeAtomic(
        vaultDir,
        file,
        toMarkdown(
          { ...data, workingOn: visit.workingOn ?? data.workingOn, updated: manilaIso(now) },
          record.body,
        ),
      );
    }
    await writeLedger(vaultDir, {
      ...ledger,
      visits: ledger.visits.filter((v) => v.until > now.getTime()),
    });
    return over.length;
  }

  /** Where the digest goes, after the demo redirect. Null when DIGEST_TO is not set. */
  #digestRecipients(): { to: string[]; redirectedFrom?: string[] } | null {
    const c = this.#config;
    if (!c.digestTo) return null;
    const original = [c.digestTo.toLowerCase()];
    if (c.redirectTo && c.redirectTo !== original[0]) {
      return { to: [c.redirectTo], redirectedFrom: original };
    }
    return { to: original };
  }

  /** True when "Send digest now" really sends: Outlook connected and MAIL_MODE=send. */
  digestSends(): boolean {
    return (
      this.driver() === "graph" && Boolean(this.#auth?.connected) && this.#config.mode === "send"
    );
  }

  /** Send digest now, step 1: who it goes to, or why it cannot be sent (the confirm box). */
  async digestCheck(now = new Date()): Promise<SendCheckResult> {
    if (!this.digestSends()) {
      return { ok: false, error: "Sending is off, so the digest is made as a draft or a file." };
    }
    const recipients = this.#digestRecipients();
    if (!recipients) return { ok: false, error: DIGEST_TO_MISSING };
    const check = checkSend({
      ...(await this.#guardInput(now)),
      recipients: recipients.to,
      text: "",
    });
    if (!check.ok) return check;
    return {
      ok: true,
      to: check.to,
      ...(recipients.redirectedFrom ? { redirectedFrom: recipients.redirectedFrom } : {}),
    };
  }

  /**
   * The daily digest (skill, section 6). The scheduled one at DIGEST_TIME, and "Make digest now",
   * are only ever a draft or a file: the outbox saves outbox/digest-<date>.eml, Outlook makes a
   * draft (D-127). "Send digest now" sends only with Outlook in send mode, after you confirm the
   * recipients, through the same guard as any send. Demo Day never touches it.
   */
  makeDigest(
    now = new Date(),
    options: { scheduled?: boolean; confirmed?: string[] } = {},
  ): Promise<{ line: string } | { error: string }> {
    return this.#exclusive(() => this.#makeDigest(now, options));
  }

  async #makeDigest(
    now: Date,
    options: { scheduled?: boolean; confirmed?: string[] },
  ): Promise<{ line: string } | { error: string }> {
    if (this.#store.demo) return { error: "Demo Day never creates real drafts or sends email." };
    const c = this.#config;
    const vaultDir = this.#store.vaultDir;
    const date = dayIn(now, c.timezone);
    const log = await readFile(join(vaultDir, "log", `${date}.md`), "utf8").catch(() => "");
    const digest = buildDigest({
      state: this.#store.state,
      log: log.split("\n").filter((l) => l.startsWith("- ")),
      date,
      longDate: longDayIn(now, c.timezone),
    });
    const driver = this.driver();
    const send = !options.scheduled && this.digestSends();
    let text: string;
    let sent: SentEntry | null = null;
    try {
      if (c.mode === "dry-run") {
        text = `mail: dry run of the daily digest (${driver}), nothing created`;
      } else if (driver === "power-automate") {
        throw new MailError(PA_NOT_SET_UP);
      } else if (driver === "outbox") {
        const out = `outbox/digest-${date}.eml`;
        const to = c.digestTo ? [c.digestTo] : [];
        await writeAtomic(
          vaultDir,
          out,
          buildEml({ to, cc: [], subject: digest.subject, text: digest.text }, now, digest.html),
        );
        text = `mail: daily digest saved as ${out}`;
      } else {
        const recipients = this.#digestRecipients();
        if (!recipients) throw new MailError(DIGEST_TO_MISSING);
        const { to, redirectedFrom } = recipients;
        const banner = redirectedFrom
          ? `<p style="margin:0;padding:8px 24px;background:#FFF4E5;font-family:${DIGEST_FONT};font-size:13px;line-height:19px;color:#1A1A1A;">${redirectBanner(redirectedFrom)}</p>`
          : "";
        const email = {
          to,
          cc: [],
          subject: digest.subject,
          text: redirectedFrom
            ? `${redirectBanner(redirectedFrom)}\n\n${digest.text}`
            : digest.text,
          html: digest.html.replace(/<body[^>]*>/, (b) => `${b}${banner}`),
        };
        if (!send) {
          await this.#withGraph((g) => g.createDraft(email));
          text = `mail: the daily digest is a draft in your Outlook Drafts, to ${to.join(", ")}`;
        } else {
          const check = await this.digestCheck(now);
          if (!check.ok) throw new MailError(check.error);
          if (!options.confirmed || !sameRecipients(check.to, options.confirmed)) {
            throw new MailError(
              "The recipients changed since you checked. Please look at the list again.",
            );
          }
          await this.#withGraph((g) => g.sendMail({ ...email, to: check.to }));
          sent = {
            at: manilaIso(now),
            itemId: "digest",
            subject: digest.subject,
            to: check.to,
            driver: "graph",
            ...(redirectedFrom ? { redirectedFrom } : {}),
          };
          text = `mail: sent the daily digest (graph) to ${check.to.join(", ")}${redirectedFrom ? ` (redirected from ${redirectedFrom.join(", ")})` : ""}`;
        }
      }
    } catch (error) {
      return { error: plain(error, "The digest could not be made. Try again.") };
    }
    const ledger = await readLedger(vaultDir);
    await writeLedger(vaultDir, {
      ...ledger,
      sends: sent ? [...ledger.sends, sent] : ledger.sends,
      digest: { lastDate: date, lastAt: manilaIso(now) },
    });
    return { line: await logLine(vaultDir, now, text) };
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
