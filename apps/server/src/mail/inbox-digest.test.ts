import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AccountInfo } from "@azure/msal-node";
import { MAIL_FOOTER } from "@hq/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type MsalLike, OutlookAuth } from "../auth/outlook";
import { VaultStore } from "../vault/store";
import { loadMailConfig } from "./config";
import { buildDigest } from "./digest";
import { GraphClient } from "./graph";
import { loadInboxRules, nextTaskId, pickOwner, routeEmail, taskTitle } from "./inbox";
import { MailService } from "./service";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const NOW = new Date("2026-10-13T06:00:00Z"); // 14:00 in Manila

let temp: string;
let vaultDir: string;
let store: VaultStore;

interface Mailbox {
  inbox: { id: string; subject: string; from: string; at: string; body: string }[];
  bodiesRead: string[];
  drafts: { subject: string; body: { contentType: string; content: string } }[];
  sent: { message: { toRecipients: { emailAddress: { address: string } }[] } }[];
}

async function setup(env: NodeJS.ProcessEnv, connected = true) {
  temp = await mkdtemp(join(tmpdir(), "hq-inbox-"));
  vaultDir = join(temp, "vault");
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
  store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
  await store.reload();
  const box: Mailbox = { inbox: [], bodiesRead: [], drafts: [], sent: [] };
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = decodeURIComponent(String(url).replace("https://graph.microsoft.com/v1.0", ""));
    if (path.startsWith("/me/mailFolders/inbox/messages")) {
      // Only these four fields are ever asked for in the list.
      expect(path).toContain("$select=id,subject,from,receivedDateTime");
      return Response.json({
        value: box.inbox.map((m) => ({
          id: m.id,
          subject: m.subject,
          from: { emailAddress: { address: m.from } },
          receivedDateTime: m.at,
        })),
      });
    }
    const body = /^\/me\/messages\/([^?]+)\?\$select=body$/.exec(path);
    if (body) {
      box.bodiesRead.push(body[1] as string);
      const m = box.inbox.find((x) => x.id === body[1]);
      return Response.json({ body: { contentType: "html", content: m?.body ?? "" } });
    }
    if (path === "/me/messages" && init?.method === "POST") {
      box.drafts.push(JSON.parse(String(init.body)));
      return Response.json({ id: "D1" });
    }
    if (path === "/me/sendMail") {
      box.sent.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 202 });
    }
    return new Response("{}", { status: 500 });
  });
  const account = { username: "me@test.example", homeAccountId: "1" } as AccountInfo;
  const msal = {
    getAuthCodeUrl: vi.fn(),
    acquireTokenByCode: vi.fn(),
    acquireTokenSilent: vi.fn(async () => ({ accessToken: "token" })),
    getAllAccounts: vi.fn(async () => (connected ? [account] : [])),
    signOut: vi.fn(),
  };
  const auth = new OutlookAuth(msal as unknown as MsalLike);
  await auth.load();
  const graph = new GraphClient({
    token: (force) => auth.token(force),
    fetch: fetch as typeof globalThis.fetch,
    sleep: async () => undefined,
  });
  const mail = new MailService({
    config: loadMailConfig({ MAIL_PROVIDER: "graph", MS_CLIENT_ID: "test", ...env }),
    store,
    auth,
    graph,
    inboxRules: (await loadInboxRules(join(repoRoot, "data"))).rules,
  });
  return { mail, box };
}
afterEach(async () => {
  if (temp) await rm(temp, { recursive: true, force: true });
});
const readVault = (rel: string) => readFile(join(vaultDir, rel), "utf8");

describe("inbox rules", () => {
  it("routes by keyword, picks the least busy helper, and names tasks", async () => {
    const { rules, problem } = await loadInboxRules(join(repoRoot, "data"));
    expect(problem).toBeNull();
    expect(routeEmail(rules, "[HQ] RFQ for anti-static bags")).toEqual({
      track: "CM",
      workflow: "cm-rfq-process",
    });
    expect(routeEmail(rules, "[HQ] Please chase PO-451208")).toEqual(rules.default);
    const seats = [
      { id: "ops-02", track: "OPS", isPlayer: false },
      { id: "ops-01", track: "OPS", isPlayer: false },
      { id: "mgr-01", track: "MGR", isPlayer: true },
    ] as never;
    const tasks = [{ id: "t-0009", owner: "ops-01", status: "todo" }] as never;
    expect(pickOwner(seats, tasks, "OPS")?.id).toBe("ops-02");
    expect(nextTaskId(tasks)).toBe("t-0010");
    expect(taskTitle("[HQ] Please chase PO-451208 with Luzon", "[HQ]")).toBe(
      "Please chase PO-451208 with Luzon",
    );
  });
});

describe("inbox to task", () => {
  it("turns only new [HQ] emails into tasks, reads only their bodies, and walks the helper", async () => {
    const { mail, box } = await setup({});
    box.inbox = [
      {
        id: "m3",
        subject: "Lunch on Friday?",
        from: "friend@test.example",
        at: "2026-10-13T05:50:00Z",
        body: "<p>Private</p>",
      },
      {
        id: "m2",
        subject: "[HQ] Please chase PO-451208 with Luzon Precision",
        from: "me@test.example",
        at: "2026-10-13T05:40:00Z",
        body: "<p>They missed the date &amp; need a nudge.</p>",
      },
      {
        id: "m1",
        subject: "[HQ] Old one from last week",
        from: "me@test.example",
        at: "2026-10-05T05:40:00Z",
        body: "old",
      },
    ];
    const lines = await mail.checkInbox(NOW);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(
      /mail: \[HQ\] email "Please chase PO-451208 with Luzon Precision" became t-\d{4} for ops-\d\d/,
    );
    // The untagged email's body is never opened. The old one is skipped.
    expect(box.bodiesRead).toEqual(["m2"]);

    await store.reload();
    const task = store.state.tasks.find((t) => t.title.startsWith("Please chase PO-451208"));
    expect(task).toMatchObject({
      status: "todo",
      workflow: "ops-pr-to-po-stock-item",
      due: "2026-10-13",
    });
    expect(task?.body).toContain("> They missed the date & need a nudge.");
    const owner = store.state.seats.find((s) => s.id === task?.owner);
    expect(owner).toMatchObject({ track: "OPS", visiting: "mail-dock" });
    expect(owner?.workingOn).toBe("Reading an [HQ] email at the Mail Dock");

    // The same email never becomes a second task.
    expect(await mail.checkInbox(new Date(NOW.getTime() + 60_000))).toEqual([]);

    // After 5 minutes the helper walks back.
    expect(await mail.endVisits(new Date(NOW.getTime() + 6 * 60_000))).toBe(1);
    await store.reload();
    expect(store.state.seats.find((s) => s.id === task?.owner)?.visiting).toBeUndefined();
  });

  it("does nothing in Demo Day, or when Outlook is not connected", async () => {
    const off = await setup({}, false);
    off.box.inbox = [
      { id: "m1", subject: "[HQ] x", from: "a@test.example", at: NOW.toISOString(), body: "" },
    ];
    expect(await off.mail.checkInbox(NOW)).toEqual([]);
    store.demo = { running: true, speed: 5, seed: 42, clock: "2026-10-13T09:00:00+08:00" };
    expect(await off.mail.tick(NOW)).toEqual({ lines: [], changed: false });
  });
});

describe("the daily digest", () => {
  it("has the four sections, escapes text, and ends with the footer", () => {
    const state = {
      seats: [{ id: "cm-03", displayName: "CM 03" }],
      queue: [
        {
          id: "q-1",
          title: "Award <RFQ-26-014> to Luzon & co",
          status: "needs-you",
          approver: "mgr-01",
          from: "cm-03",
        },
      ],
      tasks: [],
    } as never;
    const digest = buildDigest({
      state,
      log: [
        "- 09:12 cm-03 endorsed 14 PRs to ops-01 at the Endorsement Bridge",
        "- 09:30 you approved q-0001 from ops-03",
      ],
      date: "2026-10-13",
      longDate: "13 Oct 2026",
    });
    expect(digest.subject).toBe("SignalChain HQ daily digest, 13 Oct 2026");
    for (const title of [
      "What needs you",
      "What the team finished",
      "Handoffs (CM to Ops)",
      "Tomorrow",
    ]) {
      expect(digest.html).toContain(title);
      expect(digest.text).toContain(title);
    }
    expect(digest.html).toContain(
      "Award &lt;RFQ-26-014&gt; to Luzon &amp; co (from the CM 03 helper)",
    );
    expect(digest.html).not.toContain("<RFQ-26-014>");
    expect(digest.html).toContain("09:12 cm-03 endorsed 14 PRs");
    expect(digest.html).toContain(MAIL_FOOTER);
    expect(digest.html).not.toMatch(/<img|logo/i);
    expect(digest.text.endsWith(MAIL_FOOTER)).toBe(true);
  });

  it("drafts mode makes an Outlook draft, redirected, and the clock sends it once a day", async () => {
    const { mail, box } = await setup({
      MAIL_MODE: "drafts",
      DIGEST_TO: "boss@elsewhere.example",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
      MAIL_REDIRECT_TO: "me@test.example",
      DIGEST_TIME: "13:30",
    });
    const first = await mail.tick(NOW);
    expect(first.lines.join("\n")).toContain(
      "the daily digest is a draft in your Outlook Drafts, to me@test.example",
    );
    expect(box.drafts).toHaveLength(1);
    expect(box.drafts[0]?.body.contentType).toBe("HTML");
    expect(box.drafts[0]?.body.content).toContain(
      "Demo redirect. Originally to: boss@elsewhere.example",
    );
    const again = await mail.tick(new Date(NOW.getTime() + 60_000));
    expect(again.lines).toEqual([]);
    expect(box.drafts).toHaveLength(1);
  });

  it("send mode sends through the guard and records it, and a blocked send says why", async () => {
    const { mail, box } = await setup({
      MAIL_MODE: "send",
      DIGEST_TO: "me@test.example",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
    });
    const sent = await mail.sendDigest(NOW);
    expect(sent).toMatchObject({
      line: expect.stringContaining("sent the daily digest (graph) to me@test.example"),
    });
    expect(box.sent[0]?.message.toRecipients).toEqual([
      { emailAddress: { address: "me@test.example" } },
    ]);
    expect((await mail.overview()).sent[0]).toMatchObject({ itemId: "digest" });
    await rm(temp, { recursive: true, force: true });

    const blocked = await setup({
      MAIL_MODE: "send",
      DIGEST_TO: "boss@elsewhere.example",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
    });
    expect(await blocked.mail.sendDigest(NOW)).toEqual({
      error: expect.stringMatching(/not on your allowed list: boss@elsewhere\.example/),
    });
    expect(blocked.box.sent).toEqual([]);
  });

  it("the outbox saves the digest as an HTML .eml file", async () => {
    temp = await mkdtemp(join(tmpdir(), "hq-digest-"));
    vaultDir = join(temp, "vault");
    await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
    store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
    await store.reload();
    const mail = new MailService({
      config: loadMailConfig({ DIGEST_TO: "me@test.example" }),
      store,
    });
    expect(await mail.sendDigest(NOW)).toEqual({
      line: expect.stringContaining("daily digest saved as outbox/digest-2026-10-13.eml"),
    });
    const eml = await readVault("outbox/digest-2026-10-13.eml");
    expect(eml).toContain("Content-Type: text/html; charset=UTF-8");
    expect(eml).toContain("To: me@test.example");
    const ledger = JSON.parse(await readVault(".state/mail.json"));
    expect(ledger.digest.lastDate).toBe("2026-10-13");
    expect((await readdir(join(vaultDir, "outbox"))).sort()).toEqual([
      ".gitkeep",
      "digest-2026-10-13.eml",
    ]);
  });
});
