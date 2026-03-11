/**
 * Playwright e2e for watch personalization.
 */
import { expect, test } from "@playwright/test";

test("sign in, select profile, save my list, and resume episode", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill("admin@illuvrse.local");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/watch|\/admin/);

  await page.goto("/watch/profiles");
  await page.getByText("Ryan").click();
  await page.waitForURL(/\/watch/);

  await page.getByTestId("poster-card").first().click();
  await page.waitForURL(/\/watch\/show\//);
  await page.getByRole("button", { name: "Add to List" }).click();

  const showTitle = await page.locator("h1").first().textContent();

  await page.goto("/watch");
  await expect(page.getByText("My List")).toBeVisible();
  if (showTitle) {
    await expect(page.getByText(showTitle, { exact: false }).first()).toBeVisible();
  }

  await page.getByRole("link", { name: /EP/i }).first().click();
  await page.waitForURL(/\/watch\/episode\//);
  const episodeUrl = page.url();
  const episodeId = episodeUrl.split("/").pop();
  expect(episodeId).toBeTruthy();

  await page.request.post("/api/watch/progress", {
    data: {
      episodeId,
      positionSec: 723,
      durationSec: 1200
    }
  });

  await page.reload();
  await expect(page.getByText("Resuming at 12:03")).toBeVisible();
});
