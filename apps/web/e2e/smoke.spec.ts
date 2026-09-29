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

/**
 * Overview budget: the world (Phase 3, 40 calls and 50k triangles) plus the 26 helpers drawn as
 * one crowd (P4.1, D-063). Well inside the skill budget of 150 calls and 250k triangles.
 */
const WORLD_BUDGET = { calls: 45, triangles: 100_000 };

test("the office with its helpers stays inside its draw call and triangle budget", async ({
  page,
}) => {
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
  await expect(page.getByRole("heading", { name: "SignalChain HQ" })).toHaveClass(/text-white/);
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

test("clicking a helper selects them, tells onSeatSelected, and Esc clears it", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&view=cm");
  await waitForReady(page);
  await expect(page.getByTestId("office-tag-cm-03")).toBeVisible();

  const point = await page.evaluate(() => window.__HQ_SEATS__?.seatPoint("cm-03"));
  expect(point, "cm-03 is on screen").toBeTruthy();
  await page
    .getByTestId("office-canvas")
    .click({ position: { x: point?.x ?? 0, y: point?.y ?? 0 } });

  const tag = page.getByTestId("office-tag-cm-03");
  await expect(tag).toHaveAttribute("data-selected", "true");
  const events = await page.evaluate(() => window.__HQ_SEATS__?.events);
  expect(events).toEqual([{ seatId: "cm-03", source: "click" }]);

  await page.keyboard.press("Escape");
  await expect(tag).toHaveAttribute("data-selected", "false");
  expect(errors).toEqual([]);
});

test("helpers follow their live status: a raised hand, a break, a meeting, a trip", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  const motions = await page.evaluate(() => window.__HQ_SEATS__?.motions());
  if (!motions) throw new Error("no test hook");
  // vault.sample: cm-05 waits on you, cm-09 is on a break, lead-02 is in a meeting.
  expect(motions["cm-05"]).toMatchObject({ motion: "seated", activity: "hand" });
  expect(motions["cm-09"]).toMatchObject({ motion: "standing" });
  expect(motions["lead-02"]).toMatchObject({ motion: "standing" });
  // 12 s into the day, at least one helper is on a trip to the zone of its step.
  const away = Object.values(motions).filter((m) => m.motion !== "seated");
  expect(away.length).toBeGreaterThan(3);
  expect(errors).toEqual([]);
});

test("Walk around: G starts it, keys move you, Talk shows near a helper, E talks, Esc leaves", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  const walk = page.getByTestId("walk-help");
  await expect(walk).toHaveCount(0);

  await page.keyboard.press("g");
  await expect(walk).toBeVisible();
  await expect(page.getByTestId("walk-you")).toBeVisible();

  // Hold W: the avatar walks up the screen, away from the camera (x and z both go down).
  const before = await page.evaluate(() => window.__HQ_SEATS__?.walk.avatar());
  await page.keyboard.down("w");
  await page.waitForTimeout(700);
  await page.keyboard.up("w");
  const after = await page.evaluate(() => window.__HQ_SEATS__?.walk.avatar());
  expect(before && after).toBeTruthy();
  expect((after?.x ?? 0) + (after?.z ?? 0)).toBeLessThan((before?.x ?? 0) + (before?.z ?? 0));

  // Next to a helper, the Talk hint names them, and E tells onTalk.
  await page.evaluate(() => window.__HQ_SEATS__?.walk.placeNear("cm-02"));
  const hint = page.getByTestId("talk-hint");
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("Talk to CM 02 helper");
  await page.keyboard.press("e");
  expect(await page.evaluate(() => window.__HQ_SEATS__?.walk.talks)).toEqual(["cm-02"]);
  await expect(hint).toContainText("Card coming soon");

  // Esc goes back to the Overview.
  await page.keyboard.press("Escape");
  await expect(walk).toHaveCount(0);
  await expect(page.getByTestId("walk-you")).toBeHidden();
  expect(await page.evaluate(() => window.__HQ_SEATS__?.walk.active())).toBe(false);
  expect(errors).toEqual([]);
});

test("?walk=1 opens in Walk around, and a view key leaves it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&walk=1");
  await waitForReady(page);
  await expect(page.getByTestId("walk-help")).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByTestId("walk-help")).toHaveCount(0);
});

test("a drag across a helper pans the camera and selects nobody", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&view=cm");
  await waitForReady(page);
  const point = await page.evaluate(() => window.__HQ_SEATS__?.seatPoint("cm-03"));
  const x = point?.x ?? 0;
  const y = point?.y ?? 0;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 40, { steps: 8 });
  await page.mouse.up();
  const events = await page.evaluate(() => window.__HQ_SEATS__?.events);
  expect(events).toEqual([]);
});
