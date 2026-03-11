import { describe, expect, it } from "vitest";
import { detectSpatialHarassment } from "@/lib/spatialHarassmentDetection";

describe("spatial harassment detection", () => {
  it("emits enforceable moderation signal with evidence context", async () => {
    const result = await detectSpatialHarassment({
      harassmentScore: 0.93,
      nearestDistanceMeters: 0.8,
      repeatedPatternDetected: true,
      evidenceEvents: 4,
      userReportsInSession: 2
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moderationSignal).toBe(true);
    expect(result.escalationRequired).toBe(true);
    expect(result.evidenceContext.evidenceEvents).toBe(4);
  });
});
