import { describe, expect, it } from "vitest";
import { evaluateCrossFormatContinuity } from "@/lib/crossFormatContinuity";

describe("cross-format continuity engine", () => {
  it("keeps continuity when required context is preserved", async () => {
    const result = await evaluateCrossFormatContinuity({
      fromSurface: "watch",
      toSurface: "shorts",
      context: { profileId: "p1", sessionId: "s1", contentAnchor: "c1" },
      idleMinutes: 10,
      riskLevel: "low"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.coherent).toBe(true);
  });

  it("flags continuity break when required context is missing", async () => {
    const result = await evaluateCrossFormatContinuity({
      fromSurface: "watch",
      toSurface: "games",
      context: { profileId: "p1", sessionId: "s1" },
      idleMinutes: 5,
      riskLevel: "low"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.coherent).toBe(false);
    expect(result.summary.missingContextKeys).toContain("contentAnchor");
  });
});
