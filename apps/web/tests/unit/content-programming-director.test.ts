import { describe, expect, it } from "vitest";
import { generateContentProgrammingPlan } from "@/lib/contentProgrammingDirector";

describe("content programming director", () => {
  it("generates safe programming placements across surfaces", async () => {
    const result = await generateContentProgrammingPlan({
      campaignId: "camp-113",
      contentId: "asset-42",
      targetSurfaces: ["home", "watch", "shorts"],
      priority: "high"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.placements.length).toBeGreaterThan(0);
    expect(result.placements.every((placement) => typeof placement.requiresSafetyReview === "boolean")).toBe(true);
  });
});
