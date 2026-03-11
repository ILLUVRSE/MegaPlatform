import { expect, test } from "@playwright/test";

test("party night loop with intermission", async ({ page, context }) => {
  await page.goto("/party/minigames");
  await page.getByLabel("Host Name").fill("Hosty");
  await page.getByRole("button", { name: "Create Room" }).click();

  await page.waitForURL(/\/party\/minigames\/.*\/host/);
  const url = page.url();
  const match = url.match(/party\/minigames\/([^/]+)\/host/);
  expect(match).toBeTruthy();
  const code = match![1];

  const playerPage = await context.newPage();
  await playerPage.goto("/party/minigames");
  await playerPage.getByLabel("Room Code").fill(code);
  await playerPage.getByLabel("Player Name").fill("Player 2");
  await playerPage.getByRole("button", { name: "Join Room" }).click();
  await playerPage.waitForURL(/\/party\/minigames\/.*\/play/);

  await page.getByRole("button", { name: "Ready" }).click();
  await playerPage.getByRole("button", { name: "Ready" }).click();

  await page.getByRole("button", { name: "Start Round" }).click();

  await expect(page.getByText("Click to focus")).toBeVisible();
  await expect(playerPage.getByText("Click to focus")).toBeVisible();

  await expect(page.getByText("Round Results")).toBeVisible({ timeout: 10_000 });
  await expect(playerPage.getByText("Round Results")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Next Round" }).click();
  await expect(page.getByText("Final Results")).toBeVisible({ timeout: 10_000 });
  await expect(playerPage.getByText("Final Results")).toBeVisible({ timeout: 10_000 });
});
