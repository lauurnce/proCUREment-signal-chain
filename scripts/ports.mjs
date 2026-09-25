// Picks stable ports per worktree, so two worktrees can run pnpm dev at the same time.
// Main checkout: web 5173, API 4317. A worktree adds an offset from 10 to 99, based on its name.
// Offsets start at 10 so a worktree never lands on a busy-port fallback (+1 to +9) of the main checkout.
// WEB_PORT and API_PORT in the environment always win.
import { createServer } from "node:net";

export const BASE_WEB_PORT = 5173;
export const BASE_API_PORT = 4317;

/**
 * The worktree name from a path like .claude/worktrees/p3-office, or null for the main checkout.
 * @param {string} cwd
 * @returns {string | null}
 */
export function worktreeName(cwd) {
  const match = cwd.replaceAll("\\", "/").match(/\/\.claude\/worktrees\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * FNV-1a 32 bit hash, mapped to 10..99. Same name, same offset, every time.
 * @param {string} name
 * @returns {number}
 */
export function offsetFor(name) {
  let hash = 0x811c9dc5;
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % 90) + 10;
}

/**
 * @param {{ cwd: string, env: Record<string, string | undefined> }} options
 * @returns {{ worktree: string | null, webPort: number, apiPort: number }}
 */
export function resolvePorts({ cwd, env }) {
  const worktree = worktreeName(cwd);
  const offset = worktree ? offsetFor(worktree) : 0;
  return {
    worktree,
    webPort: Number(env.WEB_PORT) || BASE_WEB_PORT + offset,
    apiPort: Number(env.API_PORT) || BASE_API_PORT + offset,
  };
}

/**
 * True when nothing is listening on 127.0.0.1 at this port.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

/**
 * The first free port, starting at `port` and trying up to 10 ports.
 * @param {number} port
 * @param {Set<number>} [taken] ports already picked in this run
 * @returns {Promise<number | null>}
 */
export async function firstFreePort(port, taken = new Set()) {
  for (let candidate = port; candidate < port + 10; candidate++) {
    if (!taken.has(candidate) && (await isPortFree(candidate))) return candidate;
  }
  return null;
}
