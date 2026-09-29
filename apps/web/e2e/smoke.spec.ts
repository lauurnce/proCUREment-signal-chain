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
  await expect(badge).toContainText("Connected");
  await expect(badge).toContainText("26 helpers");

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
  // The views live in the Office tab now (P5.3), and show the key's choice there.
  await page.getByRole("tab", { name: "Office" }).click();
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
  await page.getByRole("tab", { name: "Office" }).click();
  await page.getByRole("button", { name: /Ops Wing/ }).click();
  await expect(page.getByTestId("view-announcement")).toHaveText("View: Ops Wing");
  // Software rendering in tests is slow, so allow a few frames after the 140 ms fade.
  await expect(page.getByTestId("zone-label-mail-dock")).toBeVisible({ timeout: 3_000 });
});

test("the Night button turns the office to night, and Day turns it back", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/?shots=1");
  await waitForReady(page);
  await page.getByRole("tab", { name: "Office" }).click();
  const night = page.getByRole("button", { name: "Night", exact: true });
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "true");
  // The About note switches to light text on the night backdrop (the title is in the panel now).
  await expect(page.getByTestId("about-note")).toHaveClass(/text-blue-light/);
  const day = page.getByRole("button", { name: "Day", exact: true });
  await day.click();
  await expect(day).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("Team rows open to show the steps, and Show in office stays hidden until the merge", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&tab=team");
  await waitForReady(page);
  const row = page.locator('[data-seat="cm-10"]');
  const toggle = row.getByRole("button", { name: /CM 10 helper/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  // cm-10 is on the extract step, which happens at the SAP Station.
  const now = row.locator('[aria-current="step"]');
  await expect(now).toContainText("(now)");
  await expect(now).toContainText("SAP Station");
  await expect(page.getByTestId("show-in-office-cm-10")).toHaveCount(0);
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});

test("the Board shows Done today from the completed date", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&tab=board");
  await waitForReady(page);
  const done = page.getByTestId("board-done");
  await expect(done).toContainText("Done today · 1");
  await expect(done).toContainText("Send the PR-PO list file");
  const waiting = page.getByTestId("board-waiting");
  await expect(waiting).toContainText("Waiting on a decision · 1");
  // Who it waits on, as a kind of decision, never a seat (D-046).
  await expect(waiting).toContainText("Waiting for a CM decision");
});

test("the Office tab switches a prop off in the office, and remembers the sound choice", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&tab=office");
  await waitForReady(page);
  // The view card no longer floats over the office.
  await expect(page.getByTestId("view-controls")).toHaveCount(1);
  const sofa = page.getByTestId("prop-sofa-reception");
  await expect(sofa).toHaveAttribute("aria-checked", "true");
  await sofa.click();
  await expect(sofa).toHaveAttribute("aria-checked", "false");

  const sound = page.getByTestId("sound-switch");
  await expect(sound).toHaveAttribute("aria-checked", "false");
  await sound.click();
  await page.reload();
  await waitForReady(page);
  await expect(page.getByTestId("sound-switch")).toHaveAttribute("aria-checked", "true");
  // A reload reads the file again, so the sofa is back.
  await expect(page.getByTestId("prop-sofa-reception")).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});

test("an open item keeps the instruction box to one line, and I opens it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1&open=1");
  await waitForReady(page);
  const box = page.getByTestId("instruction-box");
  await expect(box).toHaveAttribute("data-collapsed", "true");
  await page.getByTestId("item-detail").getByRole("heading").first().click();
  await page.keyboard.press("i");
  await expect(box).not.toHaveAttribute("data-collapsed", "true");
  await expect(page.getByRole("textbox", { name: "Instruction" })).toBeFocused();
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

test("Needs you puts urgent items first and explains the rule and the email draft", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);

  // For you: the email draft comes first, and says Approve does not send it.
  const items = page.locator("[data-item]");
  await expect(items.first()).toHaveAttribute("data-item", "q-0001");
  await expect(page.getByTestId("decision-card")).toContainText(
    "Approve creates a draft. Sending is a separate step.",
  );

  // Team items: the one the authority rule routed comes first, with who decides and why.
  await page.getByRole("button", { name: /Team items/ }).click();
  await expect(items.first()).toHaveAttribute("data-item", "q-0003");
  await expect(items.first()).toContainText("Price change of 6.5 percent");

  // The detail view has the status, and the draft repeats the note.
  await page.getByRole("button", { name: /For you/ }).click();
  await page.getByTestId("decision-card").focus();
  await page.keyboard.press("Enter");
  const detail = page.getByTestId("item-detail");
  await expect(detail).toContainText("Needs your decision");
  await expect(detail.getByTestId("email-preview")).toContainText(
    "Approve creates a draft. Sending is a separate step.",
  );
  expect(errors).toEqual([]);
});

test("the authority rule line names who decides, in the rule's words", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  await page.getByRole("button", { name: /Team items/ }).click();
  // The most urgent item is the focused card after the switch.
  await expect(page.locator('[data-item="q-0003"]').getByTestId("decision-card")).toContainText(
    "This needs a CM decision. Rule: a price change of 5 percent or more needs Category Manager approval.",
  );
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
