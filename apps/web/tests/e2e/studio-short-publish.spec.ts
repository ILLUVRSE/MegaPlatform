/**
 * Playwright e2e for studio short publish flow.
 * Request/response: creates short, renders, publishes, and verifies feed.
 * Guard: assumes dev server + DB.
 */
import { expect, test } from "@playwright/test";

test("studio short render and publish", async ({ page }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill("admin@illuvrse.local");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/studio/short/legacy");

  await page.getByLabel("Title").fill("Studio Test Short");
  await page.getByTestId("studio-create-project").click();
  await page.getByTestId("studio-generate-script").click();
  await expect(page.getByTestId("studio-status")).toContainText("complete");

  await page.getByTestId("studio-generate-scenes").click();
  await expect(page.getByTestId("studio-status")).toContainText("complete");

  await page.getByTestId("studio-render-short").click();
  await expect(page.getByTestId("studio-status")).toContainText("complete");

  await page.getByTestId("studio-publish-short").click();
  await expect(page.getByTestId("studio-status")).toContainText("Published");

  await page.goto("/shorts");
  await expect(page.getByText("Studio Test Short")).toBeVisible();
  const memeButton = page.getByRole("button", { name: "Meme This" }).first();
  await memeButton.click();
  await expect(memeButton).toContainText(/Queued|Memeing/);
});
