/**
 * Playwright e2e for party creation, join, seat selection, and playback sync.
 * Request/response: drives UI flows against local dev server.
 * Guard: assumes dev server and Redis are running.
 */
import { expect, test } from "@playwright/test";

test("host creates party, guests join and sync", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto("/party/create");
  await hostPage.getByLabel("Party name").fill("Core Sync Test");
  await hostPage.getByLabel("Seat count (6-24)").fill("12");
  await hostPage.getByRole("button", { name: "Create party" }).click();

  await expect(hostPage).toHaveURL(/\/party\/[A-Z0-9]{6}\/host/);

  await hostPage.getByTestId("open-media-picker").click();
  await hostPage.getByTestId("media-tab-episodes").click();
  await hostPage.getByPlaceholder("Search...").fill("Starlight");
  await hostPage.getByTestId("media-add-seed-episode-1").click();
  await hostPage.getByPlaceholder("Search...").fill("Echoes");
  await hostPage.getByTestId("media-add-seed-episode-2").click();
  await hostPage.getByTestId("media-close").click();
  await hostPage.getByTestId("playlist-save").click();

  const codeText = await hostPage.getByText(/Code:/).textContent();
  const code = (codeText ?? "").replace("Code:", "").trim();

  await guestPage.goto(`/party/${code}`);

  const hostSeat = hostPage.getByTestId("seat-1");
  await hostSeat.click();
  await expect(hostSeat).toHaveAttribute("data-seat-state", "occupied");

  const guestSeat = guestPage.getByTestId("seat-2");
  await guestSeat.click();
  await expect(guestSeat).toHaveAttribute("data-seat-state", "occupied");

  await expect(hostPage.getByTestId("seat-2")).toHaveAttribute("data-seat-state", "reserved");

  await hostPage.getByRole("button", { name: "Play" }).click();
  await hostPage.getByRole("button", { name: "Next Track" }).click();

  await expect(hostPage.getByTestId("playback-track")).toContainText("Episode 2");
  await expect(guestPage.getByTestId("playback-track")).toContainText("Episode 2");

  await hostContext.close();
  await guestContext.close();
});
