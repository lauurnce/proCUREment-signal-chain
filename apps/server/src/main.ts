import { relative } from "node:path";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { SseHub } from "./sse/hub";
import { eventForChange } from "./vault/events";
import { seedVault } from "./vault/seed";
import { VaultStore } from "./vault/store";
import { watchVault } from "./vault/watch";

const config = loadConfig();

const copied = await seedVault(config.sampleDir, config.vaultDir);
if (copied.length > 0) {
  console.log(`Vault: copied ${copied.length} missing file(s) from vault.sample/`);
}

const store = new VaultStore({ vaultDir: config.vaultDir, dataDir: config.dataDir });

// Print each warning once when it appears, and say when all warnings are gone.
let shownWarnings = new Set<string>();
store.subscribe((state) => {
  const now = new Set(state.warnings);
  for (const warning of now)
    if (!shownWarnings.has(warning)) console.warn(`Vault warning: ${warning}`);
  if (now.size === 0 && shownWarnings.size > 0) console.log("Vault: all warnings are fixed.");
  shownWarnings = now;
});
await store.reload();

const hub = new SseHub();

const app = await buildApp({
  store,
  hub,
  webPort: config.webPort,
  apiPort: config.apiPort,
  worktree: config.worktree,
  vaultPath: relative(config.repoRoot, config.vaultDir),
});

// An edit to office files only sends office.updated, so the office changes without a reload.
// Everything else sends a full snapshot.
const stopWatching = watchVault(config.vaultDir, (changed) => {
  const previous = store.state;
  store
    .reload()
    .then((next) => hub.broadcast(eventForChange(changed, previous, next)))
    .catch((error: unknown) => console.error("Vault reload failed", error));
});

await app.listen({ host: config.host, port: config.apiPort });
console.log(`API ready on http://${config.host}:${config.apiPort}`);

async function shutdown(): Promise<void> {
  await stopWatching();
  await app.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
