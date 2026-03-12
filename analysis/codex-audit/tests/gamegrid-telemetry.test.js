import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $executeRaw: vi.fn()
}));

vi.mock("@illuvrse/db", () => ({
  prisma: {
    $executeRaw: prismaMock.$executeRaw
  }
}));

import { POST } from "../../../apps/web/app/api/games/telemetry/route";

describe("gamegrid telemetry contract", () => {
  it("accepts catalog, embed, and publish telemetry events", async () => {
    prismaMock.$executeRaw.mockResolvedValue(1);

    const payloads = [
      { event: "catalog_view", surface: "games_catalog", href: "/games" },
      { event: "embed_loaded", surface: "games_embed", gameSlug: "pixelpuck", href: "/games/embed/pixelpuck" },
      { event: "creator_publish", surface: "games_create", gameId: "game-1", templateId: "BREAKOUT_MICRO" }
    ];

    for (const payload of payloads) {
      const response = await POST(
        new Request("http://localhost/api/games/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      );
      expect(response.status).toBe(200);
    }

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(3);
  });
});
