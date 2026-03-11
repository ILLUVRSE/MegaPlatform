import { test, expect } from "@playwright/test";

test("admin login and show lifecycle", async ({ page }) => {
  const timestamp = Date.now();
  const title = `Playwright Show ${timestamp}`;
  const updatedTitle = `Playwright Show Updated ${timestamp}`;
  const slug = `playwright-show-${timestamp}`;

  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill("admin@illuvrse.local");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("link", { name: "Shows", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/shows/);

  await page.getByRole("link", { name: /new show/i }).click();
  await page.getByLabel(/Title/i).fill(title);
  await page.getByLabel(/Slug/i).fill(slug);
  await page.getByRole("button", { name: /save show/i }).click();

  await expect(page).toHaveURL(/\/admin\/shows/);
  await page.waitForResponse((res) => res.url().includes("/api/admin/shows") && res.ok());
  await expect(page.getByText(title)).toBeVisible();

  await page.getByPlaceholder("Search shows").fill(title);
  const createdRow = page.getByRole("row", { name: new RegExp(title) });
  await createdRow.getByRole("link", { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/admin\/shows\/.*\/edit/);
  await page.getByLabel(/Title/i).fill(updatedTitle);
  await page.getByRole("button", { name: /save show/i }).click();

  await expect(page).toHaveURL(/\/admin\/shows/);
  await page.waitForResponse((res) => res.url().includes("/api/admin/shows") && res.ok());
  await expect(page.getByText(updatedTitle)).toBeVisible();

  await page.getByPlaceholder("Search shows").fill(updatedTitle);
  const updatedRow = page.getByRole("row", { name: new RegExp(updatedTitle) });
  await updatedRow.getByRole("button", { name: /delete/i }).click();
});

test("non-admin is blocked from admin routes", async ({ page, request }) => {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill("user@illuvrse.local");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.goto("/admin/shows");
  await expect(page).toHaveURL(/\/auth\/signin/);

  const apiRes = await request.get("/api/admin/shows");
  expect(apiRes.status()).toBe(401);
});
