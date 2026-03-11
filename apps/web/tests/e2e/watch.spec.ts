/**
 * Playwright e2e for watch experience.
 */
import { expect, test } from "@playwright/test";

test("watch home renders hero and rails", async ({ page }) => {
  await page.goto("/watch");
  await expect(page.getByTestId("watch-hero")).toBeVisible();
  await expect(page.getByText("Trending")).toBeVisible();
});

test("watch show and episode navigation", async ({ page }) => {
  await page.goto("/watch");
  await page.getByTestId("poster-card").first().click();
  await expect(page).toHaveURL(/\/watch\/show\//);
  await page.getByRole("link", { name: /EP/i }).first().click();
  await expect(page).toHaveURL(/\/watch\/episode\//);
  await expect(page.locator("video")).toBeVisible();
});
