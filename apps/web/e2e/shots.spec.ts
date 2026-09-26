import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { collectErrors, waitForReady } from "./helpers";

// pnpm shots: PNGs of each page at each size, saved to docs/qa/shots/<YYYY-MM-DD>/ (Manila date).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const outDir = join(repoRoot, "docs", "qa", "shots", today);

const sizes = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const pages = [
  { name: "office", path: "/?shots=1", fullPage: false },
  // The Lab is a long page, so it is captured top to bottom.
  { name: "lab", path: "/lab", fullPage: true },
];

test.beforeAll(() => {
  mkdirSync(outDir, { recursive: true });
});

for (const size of sizes) {
  for (const target of pages) {
    test(`${target.name} at ${size.width}x${size.height}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize(size);
      await page.goto(target.path);
      await waitForReady(page);
      await page.evaluate(() => document.fonts.ready);
      const file = join(outDir, `${target.name}-${size.width}x${size.height}.png`);
      await page.screenshot({ path: file, fullPage: target.fullPage });
      expect(errors).toEqual([]);
    });
  }
}
