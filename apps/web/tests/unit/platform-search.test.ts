import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  show: { findMany: vi.fn() },
  creatorProfile: { findMany: vi.fn() },
  studioTemplate: { findMany: vi.fn() },
  party: { findMany: vi.fn() }
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

import { searchPlatform } from "@/lib/platformSearch";

describe("platform search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.show.findMany.mockResolvedValue([{ id: "show-1", title: "Watch Heroes", slug: "watch-heroes", description: "A featured show" }]);
    prismaMock.creatorProfile.findMany.mockResolvedValue([{ id: "creator-1", displayName: "Brian", handle: "brian" }]);
    prismaMock.studioTemplate.findMany.mockResolvedValue([{ id: "template-1", title: "Hero Short", description: "Template" }]);
    prismaMock.party.findMany.mockResolvedValue([{ id: "party-1", name: "Watch Squad", code: "SQUAD" }]);
  });

  it("returns mixed search results", async () => {
    const results = await searchPlatform("watch");
    const kinds = new Set(results.map((result) => result.kind));

    expect(results.length).toBeGreaterThan(0);
    expect(kinds.has("show")).toBe(true);
    expect(kinds.has("party")).toBe(true);
  });

  it("returns empty results for a blank query", async () => {
    await expect(searchPlatform(" ")).resolves.toEqual([]);
  });
});
