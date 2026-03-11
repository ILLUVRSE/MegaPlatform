import { describe, expect, it } from "vitest";
import { consolidateLearningMemory } from "@/lib/learningConsolidation";

describe("learning consolidation", () => {
  it("promotes winning patterns into learning memory", async () => {
    const result = await consolidateLearningMemory();
    expect(result.promoted.length).toBeGreaterThan(0);
    expect(result.promoted[0]).toHaveProperty("pattern");
  });
});
