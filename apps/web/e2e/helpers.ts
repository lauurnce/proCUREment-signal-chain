import type { Page } from "@playwright/test";

/** Waits until the page says it has drawn its first full frames. */
export async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__HQ_READY__ === true, undefined, { timeout: 30_000 });
}

/** Collects console errors and page crashes, so a test can fail on any of them. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
