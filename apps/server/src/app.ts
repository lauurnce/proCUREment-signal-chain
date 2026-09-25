import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import pkg from "../package.json" with { type: "json" };
import { registerEventRoutes } from "./routes/events";
import { registerHealthRoutes } from "./routes/health";
import { registerStateRoutes } from "./routes/state";
import { registerHostCheck } from "./security/host";
import type { SseHub } from "./sse/hub";
import type { VaultStore } from "./vault/store";

export interface AppDeps {
  store: VaultStore;
  hub: SseHub;
  webPort: number;
  apiPort: number;
  worktree: string | null;
  vaultPath: string;
  logger?: boolean;
}

/** Builds the Fastify app without listening, so tests can call app.inject(). */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ? { level: "info" } : false });
  registerHostCheck(app, [deps.webPort, deps.apiPort]);
  await app.register(cors, {
    origin: [`http://127.0.0.1:${deps.webPort}`, `http://localhost:${deps.webPort}`],
  });
  registerHealthRoutes(app, {
    store: deps.store,
    version: pkg.version,
    vaultPath: deps.vaultPath,
    worktree: deps.worktree,
  });
  registerStateRoutes(app, deps.store);
  registerEventRoutes(app, deps);
  // Open event streams would keep app.close() waiting, so end them first.
  app.addHook("preClose", async () => deps.hub.close());
  return app;
}
