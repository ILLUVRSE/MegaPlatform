import { describe, expect, it } from "vitest";
import { generateRandomMinigame } from "@/lib/minigame/generator";
import { validateMinigameSpec } from "@/lib/minigame/spec";
import { TEMPLATES } from "@/lib/minigame/templates";

describe("minigame generator", () => {
  it("is deterministic for a given seed", () => {
    const seed = "deterministic-seed";
    const specA = generateRandomMinigame({ seed });
    const specB = generateRandomMinigame({ seed });
    expect(specA).toEqual(specB);
  });

  it("validates duration and win/lose conditions", () => {
    const spec = generateRandomMinigame({ seed: "validation" });
    const broken = { ...spec, durationSeconds: 25 };
    const result = validateMinigameSpec(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("durationSeconds"))).toBe(true);
  });

  it("each template builds a valid spec", () => {
    for (const template of TEMPLATES) {
      const spec = template.buildSpec("template-seed", 0.5, {
        palette: "neon-burst",
        bgStyle: "grid-glow",
        sfxStyle: "synth",
        particles: "spark"
      });
      const result = validateMinigameSpec(spec);
      expect(result.ok).toBe(true);
    }
  });

  it("rejects unsafe modifier combinations", () => {
    const clickTemplate = TEMPLATES.find((template) => template.id === "CLICK_TARGETS");
    if (!clickTemplate) throw new Error("CLICK_TARGETS template missing");
    const spec = clickTemplate.buildSpec("mod-combo", 0.5, {
      palette: "neon-burst",
      bgStyle: "grid-glow",
      sfxStyle: "synth",
      particles: "spark"
    });
    const broken = {
      ...spec,
      params: { ...spec.params, targetSize: 24 },
      modifiers: ["smallTargets", "jitteryTargets"]
    };
    const result = validateMinigameSpec(broken);
    expect(result.ok).toBe(false);
  });

  it("avoids repeating recent templates when generating without seed", () => {
    const historyKey = "illuvrse:minigame-template-history";
    window.localStorage.setItem(historyKey, JSON.stringify(["BUTTON_MASH_RACE", "DODGE_SURVIVE", "CLICK_TARGETS"]));
    const spec = generateRandomMinigame();
    expect(["BUTTON_MASH_RACE", "DODGE_SURVIVE", "CLICK_TARGETS"]).not.toContain(spec.templateId);
  });
});
