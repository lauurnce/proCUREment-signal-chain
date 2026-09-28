import { expect, test } from "@playwright/test";
import { collectErrors, waitForReady } from "./helpers";

test("the office loads, draws the 3D floor, and shows the server is OK", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");

  await waitForReady(page);
  // .first(): in dev the r3f-perf overlay adds its own small graph canvas.
  const canvas = page.getByTestId("office-canvas").locator("canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(800);

  const badge = page.getByTestId("health-badge");
  await expect(badge).toHaveAttribute("data-status", "live");
  await expect(badge).toContainText("Server OK");
  await expect(badge).toContainText("26 seats");

  await expect(page.getByTestId("about-note")).toHaveText("Unofficial prototype · Fictional data");
  expect(errors).toEqual([]);
});

/** Phase 3 world budget at the Overview, before helpers (docs/design/PHASE3_PLAN.md). */
const WORLD_BUDGET = { calls: 40, triangles: 50_000 };

test("the office world stays inside its draw call and triangle budget", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  // Let a few more frames run, so the numbers come from a settled frame.
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => window.__HQ_RENDER_INFO__);
  expect(info, "render info is shared in shots mode").toBeDefined();
  console.log(`Overview: ${info?.calls} draw calls, ${info?.triangles} triangles`);
  expect(info?.calls).toBeLessThanOrEqual(WORLD_BUDGET.calls);
  expect(info?.triangles).toBeLessThanOrEqual(WORLD_BUDGET.triangles);
  expect(errors).toEqual([]);
});

test("the Overview names the four main places, and other names show when zoomed in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  for (const zone of ["cm-wing", "ops-wing", "endorsement-bridge", "mgr-office"]) {
    await expect(page.getByTestId(`zone-label-${zone}`), zone).toBeVisible();
  }
  await expect(page.getByTestId("zone-label-mail-dock")).toBeHidden();

  await page.goto("/?shots=1&view=ops");
  await waitForReady(page);
  await expect(page.getByTestId("zone-label-mail-dock")).toBeVisible();
  await expect(page.getByTestId("zone-label-mail-dock")).toHaveText("Mail Dock");
});

test("keys 1 to 5 move the camera to each view, and never while typing", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  const label = page.getByTestId("zone-label-mail-dock");
  await expect(label).toBeHidden();

  await page.keyboard.press("3");
  await expect(page.getByTestId("view-announcement")).toHaveText("View: Ops Wing");
  await expect(page.getByRole("button", { name: /Ops Wing/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // After the 800 ms move, the camera is close enough for the other zone labels.
  await expect(label).toBeVisible({ timeout: 3_000 });

  await page.keyboard.press("5");
  await expect(page.getByTestId("view-announcement")).toHaveText("View: Endorsement Bridge");

  await page.keyboard.press("1");
  await expect(page.getByTestId("view-announcement")).toHaveText("View: Whole office");
  await expect(label).toBeHidden({ timeout: 3_000 });
  expect(errors).toEqual([]);
});

test("with reduced motion, a view change cuts behind a short fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  await page.getByRole("button", { name: /Ops Wing/ }).click();
  await expect(page.getByTestId("view-announcement")).toHaveText("View: Ops Wing");
  // Software rendering in tests is slow, so allow a few frames after the 140 ms fade.
  await expect(page.getByTestId("zone-label-mail-dock")).toBeVisible({ timeout: 3_000 });
});

test("the Night button turns the office to night, and Day turns it back", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/?shots=1");
  await waitForReady(page);
  const night = page.getByRole("button", { name: "Night" });
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "true");
  // The About note switches to light text on the night backdrop (the title is in the panel now).
  await expect(page.getByTestId("about-note")).toHaveClass(/text-blue-light/);
  await page.getByRole("button", { name: "Day" }).click();
  await expect(page.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("the Lab page opens with no console errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/lab");
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "Lab" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the office" }).click();
  await expect(page.getByTestId("office-canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the panel works with the keyboard only, and nothing is sent", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/lab/panel?shots=1");
  await waitForReady(page);
  const tab = page.getByRole("tab", { name: /Needs you/ });
  await expect(tab).toContainText("3");

  // The first card has focus on load, so keys work at once (D-031, panel spec section 5).
  await expect(page.getByTestId("decision-card")).toBeFocused();

  // Two decisions in a row with no clicks: focus must move to the next card by itself.
  await page.keyboard.press("j");
  await page.keyboard.press("a");
  await expect(page.getByTestId("undo-bar")).toContainText("Approved by you");
  await expect(page.getByTestId("undo-bar")).toContainText("Lab only, nothing is saved or sent.");
  await expect(tab).toContainText("2");
  await expect(page.getByTestId("decision-card")).toBeFocused();
  await page.keyboard.press("h");
  await expect(tab).toContainText("1");

  // Undo brings the item back and focuses it.
  await page.keyboard.press("u");
  await expect(tab).toContainText("2");
  await expect(page.getByTestId("decision-card")).toBeFocused();

  // No shortcut fires while typing in the instruction box. Esc goes back to the card.
  await page.getByRole("textbox", { name: "Instruction" }).fill("Ask for a firm date");
  await page.keyboard.press("h");
  await expect(tab).toContainText("2");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("decision-card")).toBeFocused();

  // Enter opens the item, Esc goes back to its card.
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("item-detail")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("item-detail")).toHaveCount(0);
  await expect(page.getByTestId("decision-card")).toBeFocused();

  // Keys outside the panel do nothing.
  await page.locator("body").click({ position: { x: 20, y: 400 } });
  await page.keyboard.press("a");
  await expect(tab).toContainText("2");
  expect(errors).toEqual([]);
});

test("the office panel shows live items, and decisions are only a demo", async ({ page }) => {
  const errors = collectErrors(page);
  const state = page.waitForResponse((r) => r.url().endsWith("/api/state") && r.ok());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await state;
  await waitForReady(page);

  const tab = page.getByRole("tab", { name: /Needs you/ });
  const hud = page.getByTestId("stats-hud");
  await expect(tab).toContainText("3");
  await expect(hud.getByRole("button", { name: /Needs you/ })).toContainText("3");
  await expect(page).toHaveTitle("Needs you (3) · SignalChain HQ");
  await expect(page.getByTestId("live-dot")).toContainText("Live");

  // Keys work at once, and the HUD and the page title follow each decision.
  await expect(page.getByTestId("decision-card")).toBeFocused();
  await page.keyboard.press("a");
  await expect(page.getByTestId("undo-bar")).toContainText("Demo: decisions are not saved yet.");
  await expect(hud.getByRole("button", { name: /Needs you/ })).toContainText("2");
  await expect(page).toHaveTitle("Needs you (2) · SignalChain HQ");
  await page.keyboard.press("]");
  await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("aria-selected", "true");

  // The HUD "Needs you" goes back to that tab with focus on the card.
  await hud.getByRole("button", { name: /Needs you/ }).click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("decision-card")).toBeFocused();

  // Walk around shows a note for now, and Esc closes it.
  await page.getByTestId("walk-pill").click();
  await expect(page.getByTestId("walk-note")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("walk-note")).toHaveCount(0);
  await expect(page.getByTestId("walk-pill")).toBeFocused();
  expect(errors).toEqual([]);
});

test("under 960 px the panel goes full width, and Show office swaps to the office", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  const panel = page.getByTestId("office-panel");
  expect((await panel.boundingBox())?.width).toBe(900);
  await page.getByRole("button", { name: "Show office" }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "Show panel" }).click();
  await expect(panel).toBeVisible();
  expect(errors).toEqual([]);
});
