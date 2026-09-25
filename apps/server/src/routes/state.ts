import type { AppState } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import type { VaultStore } from "../vault/store";

export function registerStateRoutes(app: FastifyInstance, store: VaultStore): void {
  app.get("/api/state", async (): Promise<AppState> => store.state);
}
