import { describe, expect, it } from "vitest";
import { autoFixMinigameSpec } from "@/lib/minigame/autofix";
import { getCompatibleModifiers } from "@/lib/minigame/gamegrid";
import { TEMPLATES } from "@/lib/minigame/templates";

describe("gamegrid validation + autofix", () => {
  it("clamps params and trims unsafe modifiers", () => {
    const template = TEMPLATES.find((entry) => entry.id === "CLICK_TARGETS");
    if (!template) throw new Error("CLICK_TARGETS template missing");
    const spec = template.buildSpec("fix-seed", 0.8, {
      palette: "neon-burst",
      bgStyle: "grid-glow",
      sfxStyle: "synth",
      particles: "spark"
    });

    const broken = {
      ...spec,
      durationSeconds: 12 as 30,
      params: { ...spec.params, targetSize: 10, targetCount: 40 },
      modifiers: ["smallTargets", "jitteryTargets", "confettiOnSuccess", "unknown", "pulsatingLights"]
    };

    const fixed = autoFixMinigameSpec(broken);
    expect(fixed.spec.durationSeconds).toBe(30);
    expect(fixed.spec.params.targetSize).toBeGreaterThanOrEqual(22);
    expect(fixed.spec.params.targetCount).toBeLessThanOrEqual(26);
    expect(fixed.spec.modifiers.length).toBeLessThanOrEqual(3);
    expect(fixed.spec.modifiers.includes("unknown")).toBe(false);
  });

  it("filters compatible modifiers by template", () => {
    const modifiers = getCompatibleModifiers("TIMING_BAR").map((modifier) => modifier.id);
    expect(modifiers).toContain("fastNeedle");
    expect(modifiers).not.toContain("mirrorControls");
  });
});
