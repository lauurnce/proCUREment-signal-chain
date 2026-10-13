import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { MAIL_FOOTER } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { SseHub } from "../sse/hub";
import { VaultStore } from "../vault/store";
import { loadMailConfig } from "./config";
import { buildEml } from "./eml";
import { MailService } from "./service";

const repoRoot = resolve(import.meta.dirname, "../../../..");
let temp: string;
let vaultDir: string;
let app: FastifyInstance;
let store: VaultStore;

async function setup(env: NodeJS.ProcessEnv = {}) {
  temp = await mkdtemp(join(tmpdir(), "hq-mail-"));
  vaultDir = join(temp, "vault");
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
  store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
  await store.reload();
  const mail = new MailService({ config: loadMailConfig(env), store });
  app = await buildApp({
    store,
    hub: new SseHub(),
    webPort: 5173,
    apiPort: 4317,
    worktree: null,
    vaultPath: "vault",
    mail,
  });
  return mail;
}
afterEach(async () => {
  await app?.close();
  if (temp) await rm(temp, { recursive: true, force: true });
});

const headers = { host: "127.0.0.1:5173" };
const approve = (id: string) =>
  app.inject({
    method: "POST",
    url: `/api/queue/${id}/decision`,
    payload: { action: "approve" },
    headers,
  });
const decodeBody = (eml: string) =>
  Buffer.from(eml.split("\r\n\r\n")[1]?.replace(/\r\n/g, "") ?? "", "base64").toString("utf8");

describe("mail settings", () => {
  it("is the outbox in drafts mode when nothing is set", () => {
    const c = loadMailConfig({});
    expect(c).toMatchObject({ provider: "outbox", mode: "drafts", maxPerHour: 20, problems: [] });
  });

  it("falls back to safe values, and says why in plain English", () => {
    const c = loadMailConfig({
      MAIL_PROVIDER: "carrier-pigeon",
      MAIL_MODE: "always",
      MAIL_ALLOWED_RECIPIENTS: " Me@Test.example , nope",
      MAIL_REDIRECT_TO: "not an address",
    });
    expect(c.provider).toBe("outbox");
    expect(c.mode).toBe("drafts");
    expect(c.allowed).toEqual(["me@test.example"]);
    expect(c.redirectTo).toBeNull();
    expect(c.problems).toHaveLength(4);
  });
});

describe("the .eml draft", () => {
  const email = {
    to: ["orders@luzonprecision.example"],
    cc: ["cm@hq.example"],
    subject: "PO-451208: recovery plan",
    text: "Hello,\nPlease reply.",
  };

  it("is an unsent draft with CRLF lines", () => {
    const eml = buildEml(email, new Date("2026-10-13T01:00:00Z"));
    expect(
      eml.startsWith("X-Unsent: 1\r\nTo: orders@luzonprecision.example\r\nCc: cm@hq.example\r\n"),
    ).toBe(true);
    expect(eml).toContain("Subject: PO-451208: recovery plan\r\n");
    expect(eml).toContain("Date: Tue, 13 Oct 2026 01:00:00 +0000\r\n");
    expect(eml.replace(/\r\n/g, "")).not.toContain("\n");
    expect(decodeBody(eml)).toBe("Hello,\r\nPlease reply.");
  });

  it("encodes a non-ASCII subject, and refuses a line break in a header", () => {
    expect(buildEml({ ...email, subject: "Salamat po" }, new Date())).toContain(
      "Subject: Salamat po",
    );
    expect(buildEml({ ...email, subject: "Señor" }, new Date())).toContain("Subject: =?UTF-8?B?");
    expect(() => buildEml({ ...email, subject: "Hi\r\nBcc: x@y.example" }, new Date())).toThrow(
      /line break/,
    );
  });
});

describe("approving an email item", () => {
  it("saves an .eml draft in vault/outbox/, records it on the item, and logs it", async () => {
    await setup();
    const response = await approve("q-0001");
    expect(response.statusCode).toBe(200);
    expect(response.json().item.mail).toMatchObject({
      driver: "outbox",
      state: "draft",
      file: "outbox/q-0001.eml",
      to: ["orders@luzonprecision.example"],
    });

    const eml = await readFile(join(vaultDir, "outbox", "q-0001.eml"), "utf8");
    expect(eml).toContain("X-Unsent: 1");
    const text = decodeBody(eml);
    expect(text).toContain("Hello Luzon Precision team,");
    expect(text).not.toContain("Helper notes");
    expect(text).toContain(MAIL_FOOTER);

    const logs = await readdir(join(vaultDir, "log"));
    const log = (
      await Promise.all(logs.map((f) => readFile(join(vaultDir, "log", f), "utf8")))
    ).join("");
    expect(log).toContain("mail: draft for q-0001 (outbox) saved as outbox/q-0001.eml");

    // The download serves the same file.
    const download = await app.inject({ url: "/api/mail/items/q-0001/eml", headers });
    expect(download.headers["content-disposition"]).toBe('attachment; filename="q-0001.eml"');
    expect(download.body).toBe(eml);
  });

  it("makes no draft for an item that is not an email, or in dry-run mode", async () => {
    await setup({ MAIL_MODE: "dry-run" });
    const notEmail = store.state.queue.find(
      (q) => q.kind !== "email-draft" && q.status === "needs-you",
    );
    if (notEmail) expect((await approve(notEmail.id)).json().item.mail).toBeUndefined();
    expect((await approve("q-0001")).json().item.mail).toMatchObject({ state: "dry-run" });
    expect(await readdir(join(vaultDir, "outbox"))).toEqual([".gitkeep"]);
  });

  it("makes one draft per approval: Make the draft again is only for a failed draft", async () => {
    await setup();
    await approve("q-0001");
    const again = await app.inject({
      method: "POST",
      url: "/api/mail/items/q-0001/draft",
      payload: {},
      headers: { ...headers, origin: "http://127.0.0.1:5173" },
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe("q-0001 already has a draft. One approval makes one draft.");
  });

  it("refuses a POST from another website", async () => {
    await setup();
    const response = await app.inject({
      method: "POST",
      url: "/api/mail/items/q-0001/draft",
      payload: {},
      headers: { ...headers, origin: "https://evil.example" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("uses the outbox and says why when graph is not ready, and the stub for Power Automate", async () => {
    const graph = await setup({ MAIL_PROVIDER: "graph" });
    expect(graph.status()).toMatchObject({
      driver: "outbox",
      configured: "graph",
      sendReady: false,
    });
    expect(graph.status().problem).toMatch(/MS_CLIENT_ID is not set/);
    await app.close();
    await rm(temp, { recursive: true, force: true });

    await setup({ MAIL_PROVIDER: "power-automate" });
    const item = (await approve("q-0001")).json().item;
    expect(item.mail).toMatchObject({ driver: "power-automate", state: "failed" });
    expect(item.mail.problem).toMatch(/needs ADI IT approval/);
    const overview = (await app.inject({ url: "/api/mail", headers })).json();
    expect(overview.status.problem).toMatch(/Power Automate bridge is not set up/);
  });
});
