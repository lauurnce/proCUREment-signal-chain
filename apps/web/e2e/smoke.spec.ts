import { expect, test } from "@playwright/test";
import { collectErrors, waitForReady } from "./helpers";

test("the office loads, draws the 3D floor, and shows the server is OK", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");

  await waitForReady(page);
  const canvas = page.getByTestId("office-canvas").locator("canvas");
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

  // Keys work only when the panel has focus (D-031).
  await page.keyboard.press("a");
  await expect(page.getByTestId("undo-bar")).toHaveCount(0);

  await page.getByTestId("hq-panel").focus();
  await page.keyboard.press("j");
  await page.keyboard.press("a");
  await expect(page.getByTestId("undo-bar")).toContainText("Approved by you");
  await expect(page.getByTestId("undo-bar")).toContainText("Lab only, nothing is saved or sent.");
  await expect(tab).toContainText("2");

  await page.keyboard.press("u");
  await expect(tab).toContainText("3");

  // No shortcut fires while typing in the instruction box.
  await page.getByRole("textbox", { name: "Instruction" }).fill("Ask for a firm date");
  await page.keyboard.press("h");
  await expect(tab).toContainText("3");

  // Enter opens the item, Esc goes back.
  await page.getByTestId("hq-panel").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("item-detail")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("item-detail")).toHaveCount(0);
  expect(errors).toEqual([]);
});
