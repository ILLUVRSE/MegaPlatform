import type { MinigameSpec, MinigameTemplateId } from "../spec";
import { TEMPLATE_PARAM_RANGES } from "../spec";
import { clamp } from "../runtime/collision";
import type { SeededRng } from "../rng";

export type ModifierDefinition = {
  id: string;
  name: string;
  description: string;
  impact: "gameplay" | "cosmetic";
  compatibleTemplates: MinigameTemplateId[] | "all";
  apply: (spec: MinigameSpec, rng: SeededRng) => MinigameSpec;
  isCompatible?: (spec: MinigameSpec, modifiers: string[]) => boolean;
};

const withParam = (spec: MinigameSpec, key: string, value: number) => {
  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  const range = ranges[key];
  if (!range) return spec;
  const nextValue = clamp(value, range.min, range.max);
  return {
    ...spec,
    params: {
      ...spec.params,
      [key]: nextValue
    }
  };
};

const applyVisualFlag = (spec: MinigameSpec, flag: string) =>
  spec.modifiers.includes(flag) ? spec : { ...spec, modifiers: [...spec.modifiers, flag] };

export const MODIFIERS: ModifierDefinition[] = [
  {
    id: "mirrorControls",
    name: "Mirror Controls",
    description: "Left is right, right is left (gentle).",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE", "COLLECT_AND_ESCAPE", "MICRO_ARENA_KO", "LANE_DODGER"],
    apply: (spec) => spec
  },
  {
    id: "lowGravity",
    name: "Low Gravity",
    description: "Floaty movement with soft drift.",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE", "COLLECT_AND_ESCAPE", "MICRO_ARENA_KO"],
    apply: (spec) => spec
  },
  {
    id: "slipperyFriction",
    name: "Slippery Floor",
    description: "Movement drifts a little longer.",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE", "COLLECT_AND_ESCAPE", "MICRO_ARENA_KO"],
    apply: (spec) => spec
  },
  {
    id: "fastNeedle",
    name: "Turbo Needle",
    description: "Timing needle moves faster.",
    impact: "gameplay",
    compatibleTemplates: ["TIMING_BAR"],
    apply: (spec) => withParam(spec, "needleSpeed", spec.params.needleSpeed * 1.2)
  },
  {
    id: "bigTargets",
    name: "Big Targets",
    description: "Targets pop bigger (less stressful).",
    impact: "gameplay",
    compatibleTemplates: ["CLICK_TARGETS"],
    apply: (spec) => withParam(spec, "targetSize", spec.params.targetSize + 6)
  },
  {
    id: "smallTargets",
    name: "Tiny Targets",
    description: "Targets shrink slightly for extra spice.",
    impact: "gameplay",
    compatibleTemplates: ["CLICK_TARGETS"],
    apply: (spec) => withParam(spec, "targetSize", spec.params.targetSize - 6)
  },
  {
    id: "jitteryTargets",
    name: "Jittery Targets",
    description: "Targets wiggle a bit.",
    impact: "gameplay",
    compatibleTemplates: ["CLICK_TARGETS"],
    apply: (spec) => spec
  },
  {
    id: "extraHazardsButSlower",
    name: "Extra Hazards, Slower",
    description: "More hazards, but they move slower.",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE", "COLLECT_AND_ESCAPE"],
    apply: (spec) => {
      if (spec.templateId === "DODGE_SURVIVE") {
        const nextRate = spec.params.spawnRate + 0.3;
        return withParam(
          withParam(spec, "spawnRate", nextRate),
          "hazardSpeed",
          spec.params.hazardSpeed * 0.85
        );
      }
      if (spec.templateId === "COLLECT_AND_ESCAPE") {
        const nextCount = spec.params.hazardCount + 1;
        return withParam(
          withParam(spec, "hazardCount", nextCount),
          "hazardSpeed",
          spec.params.hazardSpeed * 0.85
        );
      }
      return spec;
    }
  },
  {
    id: "spawnBurstEvery10s",
    name: "Spawn Burst",
    description: "A small hazard burst every 10s.",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE"],
    apply: (spec) => spec
  },
  {
    id: "bouncePhysics",
    name: "Bouncy Arena",
    description: "More bounce on bump hits.",
    impact: "gameplay",
    compatibleTemplates: ["MICRO_ARENA_KO"],
    apply: (spec) => spec
  },
  {
    id: "heavyPlayer",
    name: "Heavy Player",
    description: "Slightly slower player speed.",
    impact: "gameplay",
    compatibleTemplates: ["DODGE_SURVIVE", "COLLECT_AND_ESCAPE", "MICRO_ARENA_KO"],
    apply: (spec) => withParam(spec, "playerSpeed", spec.params.playerSpeed * 0.9)
  },
  {
    id: "zoomCameraSlight",
    name: "Zoomed In",
    description: "Camera zooms in just a touch.",
    impact: "cosmetic",
    compatibleTemplates: "all",
    apply: (spec) => applyVisualFlag(spec, "zoomCameraSlight")
  },
  {
    id: "pulsatingLights",
    name: "Pulsing Lights",
    description: "Background breathes with the beat.",
    impact: "cosmetic",
    compatibleTemplates: "all",
    apply: (spec) => applyVisualFlag(spec, "pulsatingLights")
  },
  {
    id: "confettiOnSuccess",
    name: "Victory Confetti",
    description: "Confetti pop on success.",
    impact: "cosmetic",
    compatibleTemplates: "all",
    apply: (spec) => applyVisualFlag(spec, "confettiOnSuccess")
  },
  {
    id: "speedyMeter",
    name: "Speedy Meter",
    description: "Mash meter charges faster.",
    impact: "gameplay",
    compatibleTemplates: ["BUTTON_MASH_RACE"],
    apply: (spec) => withParam(spec, "mashPerPress", spec.params.mashPerPress * 1.2)
  },
  {
    id: "targetSizeScale",
    name: "Target Size Shift",
    description: "Targets resize noticeably.",
    impact: "gameplay",
    compatibleTemplates: ["WHACK_A_MOLE_CLICKER", "AIM_TRAINER_FLICK"],
    apply: (spec, rng) => withParam(spec, "targetSize", spec.params.targetSize * rng.nextFloat(0.8, 1.2))
  },
  {
    id: "comboWindowTight",
    name: "Tight Combos",
    description: "Combo window is shorter.",
    impact: "gameplay",
    compatibleTemplates: ["WHACK_A_MOLE_CLICKER"],
    apply: (spec) => withParam(spec, "comboWindow", spec.params.comboWindow * 0.75)
  },
  {
    id: "paddleSizeScale",
    name: "Paddle Resize",
    description: "Paddle size shifts for precision.",
    impact: "gameplay",
    compatibleTemplates: ["BREAKOUT_MICRO"],
    apply: (spec, rng) => withParam(spec, "paddleWidth", spec.params.paddleWidth * rng.nextFloat(0.8, 1.15))
  },
  {
    id: "ballSpeedScale",
    name: "Ball Speed Shift",
    description: "Ball speed spikes up or down.",
    impact: "gameplay",
    compatibleTemplates: ["BREAKOUT_MICRO"],
    apply: (spec, rng) => withParam(spec, "ballSpeed", spec.params.ballSpeed * rng.nextFloat(0.85, 1.2))
  },
  {
    id: "laneSpeedScale",
    name: "Lane Speed Shift",
    description: "Lane hazards speed up or slow down.",
    impact: "gameplay",
    compatibleTemplates: ["LANE_DODGER"],
    apply: (spec, rng) => withParam(spec, "laneSpeed", spec.params.laneSpeed * rng.nextFloat(0.85, 1.2))
  }
];

export const getModifierById = (id: string) => MODIFIERS.find((modifier) => modifier.id === id);

export const applyModifiers = (spec: MinigameSpec, rng: SeededRng, modifiers: string[]) => {
  let next = { ...spec, modifiers: [...modifiers] };
  for (const modifierId of modifiers) {
    const modifier = getModifierById(modifierId);
    if (!modifier) continue;
    next = modifier.apply(next, rng);
  }
  return next;
};

export const filterCompatibleModifiers = (spec: MinigameSpec) =>
  MODIFIERS.filter((modifier) => {
    if (modifier.compatibleTemplates === "all") return true;
    return modifier.compatibleTemplates.includes(spec.templateId);
  });

export const getGameplayModifiers = () => MODIFIERS.filter((modifier) => modifier.impact === "gameplay");
