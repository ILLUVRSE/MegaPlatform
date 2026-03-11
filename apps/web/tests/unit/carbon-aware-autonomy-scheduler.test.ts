import { describe, expect, it } from "vitest";
import { scheduleCarbonAwareAutonomy } from "@/lib/carbonAwareAutonomyScheduler";

describe("carbon aware autonomy scheduler", () => {
  it("defers eligible non-urgent jobs under high carbon intensity", async () => {
    const result = await scheduleCarbonAwareAutonomy({
      jobId: "job-166",
      priority: "low",
      carbonIntensity: 350
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toBe("defer");
  });
});
