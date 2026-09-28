import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { FAVORITE } from "../src/lab/diorama/looks";
import { collectErrors, waitForReady } from "./helpers";

// pnpm shots: PNGs of each page at each size, saved to docs/qa/shots/<YYYY-MM-DD>/ (Manila date).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const outDir = join(repoRoot, "docs", "qa", "shots", today);

const sizes = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
// The panel also needs the smallest desktop size (D-021).
const PANEL_SIZES = [{ width: 1280, height: 800 }, ...sizes];

type Target = {
  name: string;
  path: string;
  fullPage: boolean;
  only?: { width: number; height: number }[];
  /** Select this helper first, as a click would, and let the camera arrive. */
  select?: string;
};

const pages: Target[] = [
  // P3.2 and P3.3 office world: the Overview and each camera preset, by day and at night.
  ...(["day", "night"] as const).flatMap((time) =>
    (["overview", "cm", "ops", "mgr", "bridge"] as const).map((view) => ({
      name: `office-${view}${time === "night" ? "-night" : ""}`,
      path: `/?shots=1&view=${view}&time=${time}`,
      fullPage: false,
    })),
  ),
  // The Lab is a long page, so it is captured top to bottom.
  { name: "lab", path: "/lab", fullPage: true },
  // P2.3 diorama study: the three looks by day, plus the favorite at night.
  ...(["a", "b", "c"] as const).map((look) => ({
    name: `diorama-${look}-day`,
    path: `/lab/diorama?shots=1&look=${look}&time=day`,
    fullPage: false,
  })),
  // P2.4 floor plan options, drawn top-down with the workflow routes.
  // P3.2: plus the Contract Corner variants for D-049.
  ...(["1", "2", "1a", "1b", "1a-dock"] as const).map((plan) => ({
    name: `floorplan-${plan}`,
    path: `/lab/floorplan?plan=${plan}`,
    fullPage: true,
  })),
  ...(FAVORITE
    ? [
        {
          name: `diorama-${FAVORITE}-night`,
          path: `/lab/diorama?shots=1&look=${FAVORITE}&time=night`,
          fullPage: false,
        },
      ]
    : []),
  // P2.5 HQ panel, docked next to the diorama: Needs you, one item open, and the Team tab.
  { name: "panel", path: "/lab/panel?shots=1", fullPage: false, only: PANEL_SIZES },
  { name: "panel-detail", path: "/lab/panel?shots=1&open=1", fullPage: false },
  { name: "panel-team", path: "/lab/panel?shots=1&tab=team", fullPage: false },
  // P4.2: a selected helper, by day and at night. The camera moves in, so the tags show roles.
  { name: "office-selected", path: "/?shots=1", fullPage: false, select: "cm-03" },
  {
    name: "office-selected-night",
    path: "/?shots=1&time=night",
    fullPage: false,
    select: "ops-07",
  },
];

test.beforeAll(() => {
  mkdirSync(outDir, { recursive: true });
});

for (const target of pages) {
  for (const size of target.only ?? sizes) {
    test(`${target.name} at ${size.width}x${size.height}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize(size);
      await page.goto(target.path);
      await waitForReady(page);
      await page.evaluate(() => document.fonts.ready);
      if (target.select) {
        // Reduced motion makes the camera cut (after a 140 ms fade) instead of easing, so the
        // shot does not depend on how fast this machine draws frames.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.evaluate((id) => window.__HQ_SEATS__?.selectSeat(id), target.select);
        await page.waitForTimeout(800);
      }
      const file = join(outDir, `${target.name}-${size.width}x${size.height}.png`);
      await page.screenshot({ path: file, fullPage: target.fullPage });
      expect(errors).toEqual([]);
    });
  }
}
