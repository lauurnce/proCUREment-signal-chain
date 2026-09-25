import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AppState, Health } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { SseHub } from "./sse/hub";
import { VaultStore } from "./vault/store";

const repoRoot = resolve(import.meta.dirname, "../../..");
let temp: string;
let app: FastifyInstance;

/** A GET as a local browser would send it, through the web port proxy. */
const get = (url: string, headers: Record<string, string> = {}) =>
  app.inject({ method: "GET", url, headers: { host: "127.0.0.1:5173", ...headers } });

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-app-"));
  const vaultDir = join(temp, "vault");
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
  const store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
  await store.reload();
  app = await buildApp({
    store,
    hub: new SseHub(),
    webPort: 5173,
    apiPort: 4317,
    worktree: "p9-test",
    vaultPath: "vault",
  });
});
afterEach(async () => {
  await app.close();
  await rm(temp, { recursive: true, force: true });
});

describe("server routes", () => {
  it("health says ok, names the worktree, and has no vault warnings", async () => {
    const response = await get("/api/health");
    expect(response.statusCode).toBe(200);
    expect(Health.parse(response.json())).toMatchObject({
      ok: true,
      worktree: "p9-test",
      warnings: 0,
    });
  });

  it("state returns the full AppState with 26 seats", async () => {
    const state = AppState.parse((await get("/api/state")).json());
    expect(state.seats).toHaveLength(26);
    expect(state.stats.needsYou).toBe(4);
  });

  it("CORS allows only the local web origin", async () => {
    const allowed = await get("/api/health", { origin: "http://127.0.0.1:5173" });
    const blocked = await get("/api/health", { origin: "http://evil.example" });
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers local hosts on the web and API ports", async () => {
    for (const host of ["127.0.0.1:5173", "localhost:5173", "127.0.0.1:4317", "localhost:4317"]) {
      expect((await get("/api/health", { host })).statusCode, host).toBe(200);
    }
  });

  it("refuses any other Host header, which blocks DNS rebinding", async () => {
    for (const host of [
      "evil.example",
      "evil.example:5173",
      "127.0.0.1:9999",
      "192.168.1.5:4317",
    ]) {
      expect((await get("/api/state", { host })).statusCode, host).toBe(403);
    }
  });
});
