import { describe, expect, it } from "vitest";
import { evaluateAnimationPresetLibrary } from "@/lib/animationPresetLibrary";

describe("animation preset library", () => {
  it("integrates presets with retarget, blend, and governance controls", async () => {
    const result = await evaluateAnimationPresetLibrary({
      presetCatalogAvailable: true,
      retargetIntegrationReady: true,
      blendIntegrationReady: true,
      governanceCompliant: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.libraryReady).toBe(true);
    expect(result.retargetMet).toBe(true);
  });
});
