import { describe, expect, it } from "vitest";
import { evaluatePublishToXrPipeline } from "@/lib/publishToXrPipeline";

describe("publish to xr pipeline", () => {
  it("requires quality and compliance checks before XR distribution", async () => {
    const result = await evaluatePublishToXrPipeline({
      qualityChecksPassed: true,
      complianceChecksPassed: true,
      distributionReady: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishReady).toBe(true);
    expect(result.qualityMet).toBe(true);
  });
});
