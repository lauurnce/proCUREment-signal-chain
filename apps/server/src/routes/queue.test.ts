import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseFrontmatter } from "@hq/shared/vault";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { SseHub } from "../sse/hub";
import { VaultStore } from "../vault/store";
import { isOwnWrite } from "../vault/write";

const repoRoot = resolve(import.meta.dirname, "../../../..");
let temp: string;
let vaultDir: string;
let app: FastifyInstance;
let store: VaultStore;
let hub: SseHub;

const post = (url: string, payload: unknown) =>
  app.inject({
    method: "POST",
    url,
    payload: payload as object,
    headers: { host: "127.0.0.1:5173" },
  });
const read = async (rel: string) => parseFrontmatter(await readFile(join(vaultDir, rel), "utf8"));
const todayLog = async () => {
  const files = (await readdir(join(vaultDir, "log"))).filter((f) => !f.startsWith("2026-09-25"));
  return readFile(join(vaultDir, "log", files[0] as string), "utf8");
};

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-queue-"));
  vaultDir = join(temp, "vault");
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
  store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data"), obsidianVault: "HQ" });
  await store.reload();
  hub = new SseHub();
  app = await buildApp({
    store,
    hub,
    webPort: 5173,
    apiPort: 4317,
    worktree: null,
    vaultPath: "vault",
  });
});
afterEach(async () => {
  await app.close();
  await rm(temp, { recursive: true, force: true });
});

describe("POST /api/queue/:id/decision", () => {
  it("approves an item: status, decision, body, the sender back to work, and a log line", async () => {
    const before = store.state.stats.needsYou;
    const response = await post("/api/queue/q-0001/decision", { action: "approve" });
    expect(response.statusCode).toBe(200);
    expect(response.json().item).toMatchObject({ id: "q-0001", status: "approved" });

    const item = await read(await queueFile("q-0001"));
    expect(item.data).toMatchObject({
      status: "approved",
      decision: { action: "approve", by: "mgr-01" },
    });
    expect(item.body).toContain("Approved by the Sr. Manager.");
    expect((await read("team/ops-03/profile.md")).data.status).toBe("working");
    expect(await todayLog()).toMatch(/you approved q-0001 from ops-03/);
    // The store and the page see it at once, and the watcher will skip our own write.
    expect(store.state.stats.needsYou).toBe(before - 1);
    expect(isOwnWrite(await queueFile("q-0001"))).toBe(true);
  });

  it("send back keeps its note, and instruct needs its text", async () => {
    expect((await post("/api/queue/q-0002/decision", { action: "instruct" })).statusCode).toBe(400);
    const ok = await post("/api/queue/q-0002/decision", {
      action: "send-back",
      note: "Add the third quote.",
    });
    expect(ok.statusCode).toBe(200);
    const item = await read(await queueFile("q-0002"));
    expect(item.data.decision).toMatchObject({ action: "send-back", note: "Add the third quote." });
  });

  it("a hold keeps the sender waiting", async () => {
    await post("/api/queue/q-0001/decision", { action: "hold" });
    expect((await read("team/ops-03/profile.md")).data.status).toBe("waiting-on-you");
  });

  it("rejects an unknown item, a decided item, and a bad id", async () => {
    expect((await post("/api/queue/q-9999/decision", { action: "approve" })).statusCode).toBe(404);
    await post("/api/queue/q-0001/decision", { action: "approve" });
    expect((await post("/api/queue/q-0001/decision", { action: "hold" })).statusCode).toBe(409);
    expect((await post("/api/queue/..%2Fsecrets/decision", { action: "approve" })).statusCode).toBe(
      400,
    );
  });

  it("a broken vault file stays a warning, and decisions still work", async () => {
    await writeFile(join(vaultDir, "queue", "q-0099-broken.md"), "---\nid: [oops\n---\n");
    await store.reload();
    expect(store.state.warnings.some((w) => w.includes("q-0099-broken.md"))).toBe(true);
    expect((await post("/api/queue/q-0001/decision", { action: "approve" })).statusCode).toBe(200);
  });

  it("sends the Obsidian vault name with the state", async () => {
    expect(store.state.obsidianVault).toBe("HQ");
    expect(store.state.queue.find((q) => q.id === "q-0001")?.file).toMatch(/^queue\/q-0001-/);
  });
});

describe("POST /api/instructions", () => {
  it("saves the instruction and logs it", async () => {
    const response = await post("/api/instructions", {
      audienceId: "seat:cm-02",
      audienceLabel: "CM 02 helper",
      seats: ["cm-02"],
      about: "PO-452114",
      text: "Ask Ops for the supplier's new price list.",
    });
    expect(response.statusCode).toBe(201);
    const { file } = response.json() as { file: string };
    const saved = await read(file);
    expect(saved.data).toMatchObject({ to: "seat:cm-02", about: "PO-452114", seats: ["cm-02"] });
    expect(saved.body).toContain("Ask Ops for the supplier's new price list.");
    expect(await todayLog()).toMatch(/you instructed CM 02 helper about PO-452114/);
  });

  it("rejects an empty instruction", async () => {
    const bad = await post("/api/instructions", {
      audienceId: "seat:cm-02",
      audienceLabel: "CM 02 helper",
      seats: ["cm-02"],
      about: null,
      text: "  ",
    });
    expect(bad.statusCode).toBe(400);
  });
});

async function queueFile(id: string): Promise<string> {
  const name = (await readdir(join(vaultDir, "queue"))).find((f) => f.startsWith(`${id}-`));
  return `queue/${name}`;
}
