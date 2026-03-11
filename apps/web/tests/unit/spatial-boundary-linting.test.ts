import { describe, expect, it } from "vitest";
import { lintSpatialBoundaries } from "@/lib/spatialBoundaryLinting";

describe("spatial boundary linting", () => {
  it("blocks forbidden xr cross-module coupling", async () => {
    const result = await lintSpatialBoundaries({
      edges: [
        { from: "xr_runtime", to: "finance" },
        { from: "xr_runtime", to: "spatial_ui" }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
  });
});
