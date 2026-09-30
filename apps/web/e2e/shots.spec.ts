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
  /** Open this helper's row in the Team tab first. */
  expand?: string;
  /** Select this helper first, as a click would, and let the camera arrive. */
  select?: string;
  /** Like select, but frames the helper at the zone of its trip, not at its desk. */
  trip?: string;
  /** Walk around mode, with the avatar placed in front of this helper. */
  walkTo?: string;
  /** Selects this helper as a click in the office would, so the panel opens their card. */
  card?: string;
  /** In Walk around, press E next to the helper, so the panel opens their card. */
  talk?: boolean;
};

const pages: Target[] = [
  // P3.2 and P3.3 office world: the Overview and each camera preset, by day and at night.
  ...(["day", "night"] as const).flatMap((time) =>
    (["overview", "cm", "ops", "mgr", "bridge"] as const).map((view) => ({
      name: `office-${view}${time === "night" ? "-night" : ""}`,
      path: `/?shots=1&view=${view}&time=${time}`,
      fullPage: false,
      // P5.1: the office now has the docked panel, so the Overview also needs 1280.
      ...(view === "overview" ? { only: PANEL_SIZES } : {}),
    })),
  ),
  // P5.1 HQ panel in the office: an item open, and under 960 px the full width panel.
  { name: "office-detail", path: "/?shots=1&open=1", fullPage: false },
  // P5.2: team items sorted by urgency, the rule item first, as a card and in full.
  { name: "office-needs-team", path: "/?shots=1&filter=team", fullPage: false },
  { name: "office-detail-rule", path: "/?shots=1&filter=team&open=1", fullPage: false },
  // P5.3: the Team tab with one helper open, the Board, and the Office tab (views moved here).
  { name: "office-team", path: "/?shots=1&tab=team", fullPage: false, expand: "cm-10" },
  { name: "office-board", path: "/?shots=1&tab=board", fullPage: false },
  { name: "office-tab", path: "/?shots=1&tab=office", fullPage: false, only: PANEL_SIZES },
  {
    name: "office-narrow",
    path: "/?shots=1",
    fullPage: false,
    only: [{ width: 900, height: 900 }],
  },
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
  // P4.3: helpers that move. A raised hand with its "!" bubble (waiting on you), the break at
  // Merienda Corner, a trip to the SAP Station, and Walk around mode next to a helper.
  { name: "office-waiting", path: "/?shots=1", fullPage: false, select: "cm-05" },
  { name: "office-merienda", path: "/?shots=1", fullPage: false, select: "ops-08" },
  { name: "office-sap-trip", path: "/?shots=1", fullPage: false, trip: "cm-10" },
  { name: "office-walk", path: "/?shots=1", fullPage: false, walkTo: "cm-02" },
  { name: "office-walk-night", path: "/?shots=1&time=night", fullPage: false, walkTo: "ops-03" },
  // P45: the two halves connected. A click on a helper opens their card in the panel, and so
  // does E next to them in Walk around.
  { name: "office-card", path: "/?shots=1", fullPage: false, card: "cm-05" },
  { name: "office-walk-talk", path: "/?shots=1", fullPage: false, walkTo: "cm-02", talk: true },
];

test.beforeAll(() => {
  mkdirSync(outDir, { recursive: true });
});

for (const target of pages) {
  for (const size of target.only ?? sizes) {
    test(`${target.name} at ${size.width}x${size.height}`, async ({ page }) => {
      const errors = collectErrors(page);
      // Headless software WebGL can lose its context in a long run, which gives a blank frame.
      // Such a shot fails instead of saving an empty canvas (council, 29 Sep 2026).
      await page.addInitScript(() => {
        document.addEventListener(
          "webglcontextlost",
          () => {
            (window as { __GL_LOST__?: boolean }).__GL_LOST__ = true;
          },
          true,
        );
      });
      await page.setViewportSize(size);
      await page.goto(target.path);
      await waitForReady(page);
      await page.evaluate(() => document.fonts.ready);
      if (target.expand) {
        await page.locator(`[data-seat="${target.expand}"] > button`).click();
      }
      if (target.select) {
        // Reduced motion makes the camera cut (after a 140 ms fade) instead of easing, so the
        // shot does not depend on how fast this machine draws frames.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.evaluate((id) => window.__HQ_SEATS__?.selectSeat(id), target.select);
        // Software rendering is slow, so give the tags time to follow the camera cut.
        await page.waitForTimeout(1500);
      }
      if (target.trip) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const there = await page.evaluate((id) => window.__HQ_SEATS__?.frameTrip(id), target.trip);
        expect(there, `${target.trip} reaches the zone of its trip`).toBe(true);
        // The camera travels further than for a desk, so give the tags time to catch up.
        await page.waitForTimeout(2000);
      }
      if (target.walkTo) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        // Entering puts the avatar at the Sr. Manager's door, so place it after that.
        await page.evaluate(() => window.__HQ_SEATS__?.walk.enter());
        await page.waitForTimeout(400);
        await page.evaluate((id) => window.__HQ_SEATS__?.walk.placeNear(id), target.walkTo);
        // The follow camera settles on the avatar, and the Talk hint shows.
        await expect(page.getByTestId("talk-hint")).toBeVisible();
        if (target.talk) {
          await page.locator("canvas").first().focus();
          await page.keyboard.press("e");
          await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute(
            "aria-selected",
            "true",
          );
        }
        await page.waitForTimeout(2500);
      }
      if (target.card) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.evaluate((id) => window.__HQ_SEATS__?.selectSeat(id, "click"), target.card);
        await expect(page.locator(`[data-seat="${target.card}"] > button`)).toHaveAttribute(
          "aria-expanded",
          "true",
        );
        await page.waitForTimeout(1500);
      }
      const lost = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
        return Boolean((window as { __GL_LOST__?: boolean }).__GL_LOST__ || gl?.isContextLost());
      });
      expect(lost, "the WebGL context was lost, so the shot would be blank").toBe(false);
      const file = join(outDir, `${target.name}-${size.width}x${size.height}.png`);
      await page.screenshot({ path: file, fullPage: target.fullPage });
      expect(errors).toEqual([]);
    });
  }
}
