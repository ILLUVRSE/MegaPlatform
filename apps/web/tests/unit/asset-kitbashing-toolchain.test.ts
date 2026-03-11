import { describe, expect, it } from "vitest";
import { evaluateAssetKitbashingToolchain } from "@/lib/assetKitbashingToolchain";

describe("asset kitbashing toolchain", () => {
  it("preserves provenance and compatibility constraints", async () => {
    const result = await evaluateAssetKitbashingToolchain({
      sourceAssetCount: 12,
      provenanceAttached: true,
      compatibilityChecksPassed: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipelineReady).toBe(true);
    expect(result.provenanceMet).toBe(true);
  });
});
