import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { resolvePorts } from "../../scripts/ports.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { webPort } = resolvePorts({ cwd: repoRoot, env: process.env });
const baseURL = `http://127.0.0.1:${webPort}`;

// Headless Chromium draws WebGL in software (SwiftShader). Slow, but it works on any machine.
const chromium = {
  ...devices["Desktop Chrome"],
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
};

export default defineConfig({
  testDir: "e2e",
  // Runs after the web server is up: fails fast if the server on our port is another checkout.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "smoke", testMatch: "smoke.spec.ts", use: chromium },
    { name: "shots", testMatch: "shots.spec.ts", use: chromium },
  ],
  webServer: {
    // Run dev.mjs directly, not through pnpm: pnpm puts scripts in their own process group,
    // so stopping "pnpm dev" could leave the web and API servers running.
    command: "node scripts/dev.mjs",
    // A throwaway vault, fresh from vault.sample every run, so the tests that save decisions
    // never touch your real vault. A dev server you already run is reused as it is.
    env: { HQ_VAULT: "vault-e2e", HQ_VAULT_FRESH: "1" },
    cwd: repoRoot,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "ignore",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
