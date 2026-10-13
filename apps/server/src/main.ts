import { rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app";
import { OutlookAuth } from "./auth/outlook";
import { loadConfig } from "./config";
import { loadMailConfig } from "./mail/config";
import { GraphClient } from "./mail/graph";
import { loadInboxRules } from "./mail/inbox";
import { MailService } from "./mail/service";
import { DemoRunner } from "./sim/runner";
import { SseHub } from "./sse/hub";
import { eventForChange } from "./vault/events";
import { seedVault } from "./vault/seed";
import { VaultStore } from "./vault/store";
import { watchVault } from "./vault/watch";
import { isOwnWrite } from "./vault/write";

// Settings like OBSIDIAN_VAULT_NAME live in .env (gitignored). Only the server reads it.
try {
  process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "../../../.env"));
} catch {
  // No .env: every setting has a safe default.
}
const config = loadConfig();

// The browser tests start the server on a throwaway vault, fresh from the sample every run.
if (process.env.HQ_VAULT_FRESH === "1" && !config.vaultDir.endsWith(`${sep}vault`)) {
  await rm(config.vaultDir, { recursive: true, force: true });
}
const copied = await seedVault(config.sampleDir, config.vaultDir);
if (copied.length > 0) {
  console.log(`Vault: copied ${copied.length} missing file(s) from vault.sample/`);
}

const store = new VaultStore({
  vaultDir: config.vaultDir,
  dataDir: config.dataDir,
  obsidianVault: config.obsidianVault,
});

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
const demo = new DemoRunner({
  store,
  hub,
  sampleDir: config.sampleDir,
  demoDir: config.demoDir,
  liveDir: config.vaultDir,
});

// Outlook (Phase 7): only with MAIL_PROVIDER=graph and MS_CLIENT_ID. Tokens stay on this server.
const mailConfig = loadMailConfig();
const auth =
  mailConfig.provider === "graph" && mailConfig.msClientId
    ? await OutlookAuth.create({
        clientId: mailConfig.msClientId,
        authority: mailConfig.msAuthority,
        secretsDir: join(config.repoRoot, ".secrets"),
      })
    : null;
const graph = auth ? new GraphClient({ token: (force) => auth.token(force) }) : null;
const inbox = await loadInboxRules(config.dataDir);
if (inbox.problem) console.warn(`Mail: ${inbox.problem}`);
const mail = new MailService({ config: mailConfig, store, auth, graph, inboxRules: inbox.rules });
for (const problem of mail.status().problem?.split(/(?<=\.) /) ?? [])
  console.warn(`Mail: ${problem}`);
if (auth?.cacheWarning) console.warn(`Mail: ${auth.cacheWarning}`);
if (auth)
  console.log(
    `Mail: Outlook ${auth.account ? `signed in as ${auth.account}` : "not connected yet"}.`,
  );

const app = await buildApp({
  store,
  hub,
  webPort: config.webPort,
  apiPort: config.apiPort,
  worktree: config.worktree,
  vaultPath: relative(config.repoRoot, config.vaultDir),
  demo,
  mail,
});

// An edit to office files only sends office.updated, so the office changes without a reload.
// Everything else sends a full snapshot.
const stopWatching = watchVault(config.vaultDir, (all) => {
  // Our own writes already reloaded the vault and sent their event (routes/queue.ts).
  // During Demo Day the page shows vault-demo/, so edits to your vault wait until it stops.
  if (demo.status()) return;
  const changed = all.filter((path) => !isOwnWrite(path));
  if (changed.length === 0) return;
  const previous = store.state;
  store
    .reload()
    .then((next) => hub.broadcast(eventForChange(changed, previous, next)))
    .catch((error: unknown) => console.error("Vault reload failed", error));
});

await app.listen({ host: config.host, port: config.apiPort });
console.log(`API ready on http://${config.host}:${config.apiPort}`);

// The mail clock: helpers walk back from the Mail Dock, the inbox check, and the daily digest.
let ticking = false;
const mailClock = setInterval(() => {
  if (ticking) return;
  ticking = true;
  mail
    .tick()
    .then(async ({ lines, changed }) => {
      if (!changed) return;
      const state = await store.reload();
      hub.broadcast({ type: "state.snapshot", state });
      for (const line of lines) hub.broadcast({ type: "log.appended", line });
    })
    .catch((error: unknown) => console.error("Mail clock failed", error))
    .finally(() => {
      ticking = false;
    });
}, 30_000);
mailClock.unref();

async function shutdown(): Promise<void> {
  clearInterval(mailClock);
  await stopWatching();
  await app.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
