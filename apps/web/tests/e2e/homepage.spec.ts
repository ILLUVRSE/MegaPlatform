import { expect, test } from "@playwright/test";

test("wall supports like and comment", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-wall")).toBeVisible();

  const likeButton = page.getByRole("button", { name: /Like/i }).first();
  await expect(likeButton).toBeVisible();
  await likeButton.click();

  const commentButton = page.getByRole("button", { name: /Comment/i }).first();
  await commentButton.click();
  await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();

  await page.getByPlaceholder("Write a comment").fill("E2E comment");
  await page.getByRole("button", { name: "Comment" }).last().click();
  await expect(page.getByText("E2E comment")).toBeVisible();
});

test("switches to shorts mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Shorts" }).click();
  await expect(page.getByRole("button", { name: /Like/i }).first()).toBeVisible();
});
