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
