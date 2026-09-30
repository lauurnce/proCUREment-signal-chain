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

test("Team rows open to show the steps, and opening one shows that helper in the office", async ({
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
  // Opening the row selected the helper in the office, through the office link.
  await expect(page.getByTestId("office-tag-cm-10")).toHaveAttribute("data-selected", "true");
  const events = await page.evaluate(() => window.__HQ_SEATS__?.events);
  expect(events).toEqual([{ seatId: "cm-10", source: "api" }]);
  await expect(page.getByTestId("show-in-office-cm-10")).toBeVisible();
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

  // The Walk around pill starts Walk around and shows it is on, and Esc leaves it.
  const pill = page.getByTestId("walk-pill");
  await pill.click();
  await expect(page.getByTestId("walk-help")).toBeVisible();
  await expect(pill).toHaveAttribute("aria-pressed", "true");
  await expect(pill).toContainText("Stop walking");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("walk-help")).toHaveCount(0);
  await expect(pill).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("Walk around always ends: the pill stops it, and so does Esc from the panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  const pill = page.getByTestId("walk-pill");
  const help = page.getByTestId("walk-help");
  await pill.click();
  await expect(help).toBeVisible();
  await pill.click();
  await expect(help).toHaveCount(0);
  // With focus in the panel and nothing open there, Esc stops walking.
  await pill.click();
  await expect(help).toBeVisible();
  await page.getByTestId("decision-card").focus();
  await page.keyboard.press("Escape");
  await expect(help).toHaveCount(0);
});

test("a helper clicked in the office keeps a half-read decision to go back to", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  await page.getByTestId("decision-card").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("item-detail")).toBeVisible();
  await page.evaluate(() => window.__HQ_SEATS__?.selectSeat("cm-05", "click"));
  await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("aria-selected", "true");
  // One row shows the helper selected in the office.
  await expect(page.locator('[data-seat="cm-05"]')).toHaveAttribute("aria-current", "true");
  const back = page.getByTestId("back-to-decision");
  await expect(back).toContainText("Back to decision on PO-451208");
  await back.click();
  await expect(page.getByTestId("item-detail")).toBeVisible();
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
  // The panel opens their card: the Team tab, with their row open.
  await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("aria-selected", "true");
  const row = page.locator('[data-seat="cm-03"] > button');
  await expect(row).toHaveAttribute("aria-expanded", "true");

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

  // The first Needs you card has focus on load, and keys there belong to the panel. G works
  // once the office has focus.
  await page.keyboard.press("g");
  await expect(walk).toHaveCount(0);
  await page.locator("body").click({ position: { x: 20, y: 400 } });
  await page.keyboard.press("g");
  await expect(walk).toBeVisible();
  await expect(page.getByTestId("walk-you")).toBeVisible();
  // The canvas takes focus, so the keys steer at once.
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("CANVAS");

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
  // Screen readers hear who is in reach.
  await expect(page.getByTestId("walk-live")).toHaveText("Near CM 02 helper. Press E to talk.");
  await page.keyboard.press("e");
  expect(await page.evaluate(() => window.__HQ_SEATS__?.walk.talks)).toEqual(["cm-02"]);
  // E opens their card in the panel, and the keys still walk.
  await expect(page.getByRole("tab", { name: "Team" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-seat="cm-02"] > button')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("CANVAS");

  // Esc goes back to the Overview.
  await page.keyboard.press("Escape");
  await expect(walk).toHaveCount(0);
  await expect(page.getByTestId("walk-you")).toBeHidden();
  expect(await page.evaluate(() => window.__HQ_SEATS__?.walk.active())).toBe(false);
  expect(errors).toEqual([]);
});

test("at the Overview most tags are chips, and a helper waiting on you shows its name", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?shots=1");
  await waitForReady(page);
  // vault.sample: cm-05 waits on you. cm-01 is working.
  await expect(page.getByTestId("office-tag-cm-05")).toHaveAttribute("data-mode", "compact");
  await expect(page.getByTestId("office-tag-cm-01")).toHaveAttribute("data-mode", "chip");
  // Zoomed in, every tag is full.
  await page.keyboard.press("2");
  await expect(page.getByTestId("office-tag-cm-01")).toHaveAttribute("data-mode", "full");
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
