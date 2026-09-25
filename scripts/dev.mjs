// pnpm dev: picks the ports for this worktree, prints them, then runs the web app and the server together.
// It starts Vite and the server directly (not through a nested pnpm), so stopping is quiet and clean.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { firstFreePort, resolvePorts } from "./ports.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Node loads .env itself, so optional WEB_PORT and API_PORT overrides apply. Values are never printed.
const envFile = resolve(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const wanted = resolvePorts({ cwd: root, env: process.env });
const webPort = await firstFreePort(wanted.webPort);
const apiPort = await firstFreePort(wanted.apiPort, new Set([webPort ?? 0]));

if (webPort === null || apiPort === null) {
  console.error(`Could not find free ports near ${wanted.webPort} and ${wanted.apiPort}.`);
  process.exit(1);
}
for (const [name, want, got] of [
  ["Web", wanted.webPort, webPort],
  ["API", wanted.apiPort, apiPort],
]) {
  if (want !== got) console.warn(`  ${name} port ${want} is busy, using ${got} instead.`);
}

const where = wanted.worktree ? `worktree ${wanted.worktree}` : "main checkout";
console.log("");
console.log(`  SignalChain HQ (${where})`);
console.log(`  Web  http://127.0.0.1:${webPort}`);
console.log(`  API  http://127.0.0.1:${apiPort}`);
console.log("");

const env = {
  ...process.env,
  WEB_PORT: String(webPort),
  API_PORT: String(apiPort),
  ...(process.stdout.isTTY ? { FORCE_COLOR: "1" } : {}),
};

/** Starts one app and prefixes each output line with its name. */
function start(name, app, bin, args) {
  const cwd = join(root, "apps", app);
  const child = spawn(join(cwd, "node_modules", ".bin", bin), args, { cwd, env });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => console.log(`${name} │ ${line}`));
  }
  return child;
}

const children = [
  start("web", "web", "vite", []),
  start("api", "server", "tsx", ["watch", "--clear-screen=false", "src/main.ts"]),
];

let stopping = false;
function stopAll(signal, exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
  // If something hangs, do not wait forever.
  setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
  }, 5_000).unref();
  Promise.all(children.map((child) => new Promise((done) => child.once("close", done)))).then(
    () => {
      if (exitCode === 0) console.log("\n  Stopped.");
      process.exit(exitCode);
    },
  );
}

// Ctrl+C is a normal way to stop, so it ends quietly with code 0.
process.on("SIGINT", () => stopAll("SIGINT", 0));
process.on("SIGTERM", () => stopAll("SIGTERM", 0));

// If one app crashes on its own, stop the other one too, and report the failure.
for (const [index, child] of children.entries()) {
  child.once("exit", (code) => {
    if (stopping) return;
    console.error(
      `\n  The ${index === 0 ? "web app" : "server"} stopped (code ${code}). Stopping the rest.`,
    );
    stopAll("SIGTERM", code || 1);
  });
}
