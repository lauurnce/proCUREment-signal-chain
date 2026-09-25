import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { resolvePorts } from "../../../scripts/ports.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const Port = z.coerce.number().int().min(1024).max(65535);

export interface Config {
  host: "127.0.0.1";
  apiPort: number;
  webPort: number;
  /** Worktree name, or null for the main checkout. */
  worktree: string | null;
  repoRoot: string;
  vaultDir: string;
  sampleDir: string;
  dataDir: string;
  backupsDir: string;
}

/** Reads ports and paths. pnpm dev passes WEB_PORT and API_PORT, otherwise they are worked out per worktree. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const fallback = resolvePorts({ cwd: repoRoot, env });
  return {
    host: "127.0.0.1",
    apiPort: Port.parse(env.API_PORT || fallback.apiPort),
    webPort: Port.parse(env.WEB_PORT || fallback.webPort),
    worktree: fallback.worktree,
    repoRoot,
    vaultDir: join(repoRoot, "vault"),
    sampleDir: join(repoRoot, "vault.sample"),
    dataDir: join(repoRoot, "data"),
    backupsDir: join(repoRoot, "vault-backups"),
  };
}
