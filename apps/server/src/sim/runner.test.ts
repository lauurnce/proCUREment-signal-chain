import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { SseHub } from "../sse/hub";
import { VaultStore } from "../vault/store";
import { DemoRunner } from "./runner";

const repoRoot = resolve(import.meta.dirname, "../../../..");
let temp: string;
let liveDir: string;
let demoDir: string;
let store: VaultStore;
let runner: DemoRunner;
let app: FastifyInstance;

const post = (url: string, payload: unknown = {}) =>
  app.inject({
    method: "POST",
    url,
    payload: payload as object,
    headers: { host: "127.0.0.1:5173" },
  });

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-demo-"));
  liveDir = join(temp, "vault");
  demoDir = join(temp, "vault-demo");
  await cp(join(repoRoot, "vault.sample"), liveDir, { recursive: true });
  store = new VaultStore({ vaultDir: liveDir, dataDir: join(repoRoot, "data") });
  await store.reload();
  const hub = new SseHub();
  runner = new DemoRunner({
    store,
    hub,
    sampleDir: join(repoRoot, "vault.sample"),
    demoDir,
    liveDir,
  });
  app = await buildApp({
    store,
    hub,
    webPort: 5173,
    apiPort: 4317,
    worktree: null,
    vaultPath: "vault",
    demo: runner,
  });
});
afterEach(async () => {
  await app.close();
  await rm(temp, { recursive: true, force: true });
});

describe("Demo Day runner", () => {
  it("plays a day on vault-demo, never on the live vault, and stop goes back", async () => {
    const liveQueue = await readdir(join(liveDir, "queue"));
    const started = await post("/api/sim/start", { seed: 42, speed: 20 });
    expect(started.statusCode).toBe(200);
    expect(started.json().demo).toMatchObject({ running: true, seed: 42, speed: 20 });
    // The day starts empty: no open items from the sample.
    expect(store.state.queue).toHaveLength(0);
    expect(store.state.demo?.running).toBe(true);

    await runner.fastForward(3 * 3600);
    expect(store.state.queue.length).toBeGreaterThan(3);
    expect(store.state.demo?.clock).toMatch(/T11:00:00\+08:00$/);
    expect(await readdir(join(liveDir, "queue"))).toEqual(liveQueue);

    // A decision during Demo Day goes to the demo vault.
    const forYou = store.state.queue.find(
      (q) => q.approver === "mgr-01" && q.status === "needs-you",
    );
    if (forYou) {
      expect(
        (await post(`/api/queue/${forYou.id}/decision`, { action: "approve" })).statusCode,
      ).toBe(200);
      expect(await readdir(join(liveDir, "queue"))).toEqual(liveQueue);
    }

    expect((await post("/api/sim/stop")).json()).toEqual({ demo: null });
    expect(store.vaultDir).toBe(liveDir);
    expect(store.state.demo).toBeNull();
    expect(store.state.queue.map((q) => q.id).sort()).toEqual([
      "q-0001",
      "q-0002",
      "q-0003",
      "q-0004",
    ]);
  });

  it("logs decisions at the simulated time, and a hold comes back as a reminder", async () => {
    await post("/api/sim/start", { seed: 42, speed: 20 });
    await runner.fastForward(5 * 3600);
    const forYou = store.state.queue.find(
      (q) => q.approver === "mgr-01" && q.status === "needs-you",
    );
    if (!forYou) throw new Error("seed 42 should have an item for you by 13:00");
    const held = await post(`/api/queue/${forYou.id}/decision`, { action: "hold" });
    // 13:00 in the simulated day, not the real clock.
    expect(held.json().line).toMatch(new RegExp(`^- 13:00 you held ${forYou.id}`));

    await runner.fastForward(65 * 60);
    expect(store.state.queue.find((q) => q.id === forYou.id)?.status).toBe("needs-you");
    // Simulated decisions name a kind of decider, never a seat (D-046).
    const [today] = await readdir(join(demoDir, "log"));
    const log = await readFile(join(demoDir, "log", today ?? ""), "utf8");
    expect(log).toContain(`reminded you about ${forYou.id}`);
    expect(log).toMatch(/Demo Day: q-\d+ from \S+ (approved|sent back) by a simulated /);
    expect(log).not.toMatch(/(cm|ops|lead)-\d+ (approved|sent back) q-/);
  }, 30_000);

  it("changes speed, and rejects a speed it does not have", async () => {
    await post("/api/sim/start", { seed: 1, speed: 1 });
    expect((await post("/api/sim/speed", { speed: 5 })).json().demo.speed).toBe(5);
    expect((await post("/api/sim/speed", { speed: 3 })).statusCode).toBe(400);
  });
});
