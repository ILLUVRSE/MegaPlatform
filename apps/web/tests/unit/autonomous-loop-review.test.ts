import { describe, expect, it } from "vitest";
import { buildAutonomousLoopReliabilityReview } from "@/lib/autonomousLoopReview";

describe("autonomous loop reliability review", () => {
  it("evaluates loop checks and override runbook presence", async () => {
    const review = await buildAutonomousLoopReliabilityReview();
    expect(review.checks.length).toBe(3);
    expect(typeof review.overrideRunbookExists).toBe("boolean");
  });
});
