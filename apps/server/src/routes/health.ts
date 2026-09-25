import type { Health } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import type { VaultStore } from "../vault/store";

export function registerHealthRoutes(
  app: FastifyInstance,
  deps: { store: VaultStore; version: string; vaultPath: string; worktree: string | null },
): void {
  app.get("/api/health", async (): Promise<Health> => {
    return {
      ok: true,
      version: deps.version,
      vaultPath: deps.vaultPath,
      worktree: deps.worktree,
      warnings: deps.store.state.warnings.length,
    };
  });
}
