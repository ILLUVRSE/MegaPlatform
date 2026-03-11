import { expect, test } from "@playwright/test";

test("generates and plays a minigame", async ({ page }) => {
  await page.goto("/games");
  await page.getByRole("button", { name: "🎲 Generate Random Minigame" }).click();

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const focusOverlay = page.getByText("Click to focus");
  if (await focusOverlay.isVisible()) {
    await focusOverlay.click();
  } else {
    await canvas.click();
  }
  const initialScroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  const afterScroll = await page.evaluate(() => window.scrollY);
  expect(afterScroll).toBe(initialScroll);

  const timer = page.locator("text=⏱");
  const firstTimer = await timer.innerText();
  await page.waitForTimeout(400);
  const secondTimer = await timer.innerText();
  expect(secondTimer).not.toEqual(firstTimer);

  await page.keyboard.press("Space");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  await expect(page.getByText("Game Over")).toBeVisible({ timeout: 6000 });
});
