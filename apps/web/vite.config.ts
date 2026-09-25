import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolvePorts } from "../../scripts/ports.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { webPort, apiPort } = resolvePorts({ cwd: repoRoot, env: process.env });
const api = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
    // The browser only talks to this origin. /api (including the event stream) goes to the local server.
    proxy: {
      "/api": { target: api, changeOrigin: false },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
  },
});
