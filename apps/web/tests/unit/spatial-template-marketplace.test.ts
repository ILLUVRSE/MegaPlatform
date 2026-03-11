import { describe, expect, it } from "vitest";
import { evaluateSpatialTemplateMarketplace } from "@/lib/spatialTemplateMarketplace";

describe("spatial template marketplace", () => {
  it("supports publish/version/reuse template lifecycle", async () => {
    const result = await evaluateSpatialTemplateMarketplace({
      publishOperational: true,
      versioningOperational: true,
      reuseOperational: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.marketplaceReady).toBe(true);
    expect(result.versioningReady).toBe(true);
  });
});
