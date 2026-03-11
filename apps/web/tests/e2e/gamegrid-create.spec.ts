import { expect, test } from "@playwright/test";

test("creates and publishes a GameGrid build", async ({ page }) => {
  await page.goto("/games/create");

  await page.getByRole("button", { name: "Breakout Micro" }).click();
  await page.getByLabel("Game title").fill("E2E Grid Game");

  const modifierButton = page.getByRole("button", { name: "Victory Confetti" });
  if (await modifierButton.isVisible()) {
    await modifierButton.click();
  }

  await page.getByTestId("preview-play").click();

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const focusOverlay = page.getByText("Click to focus");
  if (await focusOverlay.isVisible()) {
    await focusOverlay.click();
  } else {
    await canvas.click();
  }
  const initialScroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  const afterScroll = await page.evaluate(() => window.scrollY);
  expect(afterScroll).toBe(initialScroll);

  await page.getByTestId("save-draft").click();
  await expect(page.getByText("Draft saved")).toBeVisible({ timeout: 5000 });

  await page.getByTestId("publish-game").click();
  await expect(page.getByText("Published to community")).toBeVisible({ timeout: 5000 });

  const shareText = await page.getByTestId("share-url").innerText();
  const sharePath = shareText.split("Share: ")[1];
  expect(sharePath).toContain("/games/user/");

  await page.goto("/games/community");
  await expect(page.getByText("E2E Grid Game")).toBeVisible();

  await page.goto(sharePath);
  await expect(page.locator("canvas")).toBeVisible();
});
