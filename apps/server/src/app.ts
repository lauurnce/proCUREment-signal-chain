import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import pkg from "../package.json" with { type: "json" };
import type { MailService } from "./mail/service";
import { registerEventRoutes } from "./routes/events";
import { registerHealthRoutes } from "./routes/health";
import { registerMailRoutes } from "./routes/mail";
import { registerQueueRoutes } from "./routes/queue";
import { registerSimRoutes } from "./routes/sim";
import { registerStateRoutes } from "./routes/state";
import { registerHostCheck } from "./security/host";
import type { DemoRunner } from "./sim/runner";
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
  /** Demo Day. Without it, the /api/sim routes are not there. */
  demo?: DemoRunner;
  /** Mail. Without it, approvals make no drafts and the /api/mail routes are not there. */
  mail?: MailService;
}

/** Builds the Fastify app without listening, so tests can call app.inject(). */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ? { level: "info" } : false });
  registerHostCheck(app, [deps.webPort, deps.apiPort]);
  await app.register(cors, {
    origin: [`http://127.0.0.1:${deps.webPort}`, `http://localhost:${deps.webPort}`],
  });
  // An unexpected error never shows file paths or library messages on the page.
  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status < 500) return reply.code(status).send({ error: "That request is not valid." });
    request.log.error(error);
    console.error("Request failed", request.method, request.url, error);
    return reply.code(500).send({ error: "Something went wrong. Try again." });
  });
  registerHealthRoutes(app, {
    store: deps.store,
    version: pkg.version,
    vaultPath: deps.vaultPath,
    worktree: deps.worktree,
  });
  registerStateRoutes(app, deps.store);
  registerQueueRoutes(app, deps);
  if (deps.demo) registerSimRoutes(app, deps.demo);
  if (deps.mail) registerMailRoutes(app, { ...deps, mail: deps.mail });
  registerEventRoutes(app, deps);
  // Open event streams would keep app.close() waiting, so end them first.
  app.addHook("preClose", async () => {
    await deps.demo?.stop(false);
    deps.hub.close();
  });
  return app;
}
