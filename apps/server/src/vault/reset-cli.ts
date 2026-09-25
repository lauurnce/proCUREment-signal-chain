import { relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { loadConfig } from "../config";
import { resetVault } from "./seed";

// pnpm vault:reset. Asks first (or pass --yes), refuses while the server runs, and backs up the old vault.
const config = loadConfig();

async function serverIsRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${config.apiPort}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function confirm(): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  if (!process.stdin.isTTY) {
    console.error("Vault reset needs a yes. Run it in a terminal, or add --yes.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "This moves vault/ to vault-backups/ and makes a fresh copy of vault.sample/. Type yes to go on: ",
  );
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

if (await serverIsRunning()) {
  console.error(
    `The server is running on port ${config.apiPort}. Stop pnpm dev first, then try again.`,
  );
  process.exit(1);
}

if (!(await confirm())) {
  console.log("Vault reset cancelled. Nothing changed.");
  process.exit(0);
}

const backup = await resetVault(config);
if (backup) console.log(`Old vault saved in ${relative(config.repoRoot, backup)}/`);
console.log("Fresh vault ready in vault/.");
