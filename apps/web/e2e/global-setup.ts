import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Health } from "@hq/shared";
import type { FullConfig } from "@playwright/test";
import { worktreeName } from "../../../scripts/ports.mjs";

const expectedWorktree = worktreeName(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."));

/**
 * Makes sure the server on our port belongs to this checkout. Without this check,
 * Playwright could reuse another worktree's server and pass while testing the wrong code.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  const response = await fetch(`${baseURL}/api/health`);
  const health = Health.parse(await response.json());
  if (health.worktree !== expectedWorktree) {
    const theirs = health.worktree ?? "the main checkout";
    const ours = expectedWorktree ?? "the main checkout";
    throw new Error(
      `The server on ${baseURL} belongs to ${theirs}, not ${ours}. Stop the other pnpm dev, then run the tests again.`,
    );
  }
}
