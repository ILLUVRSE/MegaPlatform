import type { MinigameSpec, MinigameTemplateId } from "./spec";
import { TEMPLATE_DIFFICULTY_DIRECTIONS, TEMPLATE_PARAM_RANGES } from "./spec";
import { TEMPLATE_MAP } from "./templates";
import { THEME_PALETTES, getPaletteById } from "./theme";
import { applyModifiers, filterCompatibleModifiers } from "./modifiers";
import { SeededRng, randomSeed } from "./rng";

export type GamegridTemplate = {
  id: MinigameTemplateId;
  name: string;
  description: string;
  vibe: string;
};

export type DifficultyPreset = "easy" | "normal" | "hard";
export type DifficultyScore = {
  score: number;
  label: "Easy" | "Normal" | "Hard";
};

export type TemplatePresetPack = {
  id: string;
  label: string;
  description: string;
  difficulty: DifficultyPreset;
  ramp: number;
  modifiers: string[];
};

export type TemplateHelp = {
  headline: string;
  summary: string;
  tips: string[];
  controls: string[];
};

export type ObjectiveOption = {
  id: string;
  label: string;
  description: string;
  apply: (spec: MinigameSpec) => MinigameSpec;
};

export const GAMEGRID_TEMPLATES: GamegridTemplate[] = [
  {
    id: "BUTTON_MASH_RACE",
    name: "Button Mash Race",
    description: "Charge the meter with quick taps.",
    vibe: "Speed + stamina"
  },
  {
    id: "DODGE_SURVIVE",
    name: "Dodge Survive",
    description: "Stay alive while hazards swarm.",
    vibe: "Reflex + flow"
  },
  {
    id: "CLICK_TARGETS",
    name: "Click Targets",
    description: "Pop targets before the timer melts.",
    vibe: "Precision + pace"
  },
  {
    id: "TIMING_BAR",
    name: "Timing Bar",
    description: "Hit the sweet spot on the bar.",
    vibe: "Rhythm + nerves"
  },
  {
    id: "COLLECT_AND_ESCAPE",
    name: "Collect & Escape",
    description: "Grab everything then hit the exit.",
    vibe: "Route + risk"
  },
  {
    id: "MICRO_ARENA_KO",
    name: "Micro Arena KO",
    description: "Bump foes out of a tiny arena.",
    vibe: "Brawl + chaos"
  },
  {
    id: "BREAKOUT_MICRO",
    name: "Breakout Micro",
    description: "Shatter bricks with a spicy bounce.",
    vibe: "Bounce + accuracy"
  },
  {
    id: "WHACK_A_MOLE_CLICKER",
    name: "Whack-a-Mole",
    description: "Whack the moles before they hide.",
    vibe: "Whiplash + timing"
  },
  {
    id: "LANE_DODGER",
    name: "Lane Dodger",
    description: "Slide lanes and dodge the rush.",
    vibe: "Lane mastery"
  },
  {
    id: "AIM_TRAINER_FLICK",
    name: "Aim Trainer",
    description: "Flick shots before targets shrink.",
    vibe: "Aim + focus"
  }
];

const TEMPLATE_DIFFICULTY_CURVES: Record<
  MinigameTemplateId,
  { easy: number; normal: number; hard: number; randomMin: number; randomMax: number }
> = {
  BUTTON_MASH_RACE: { easy: 0.22, normal: 0.52, hard: 0.82, randomMin: 0.2, randomMax: 0.85 },
  DODGE_SURVIVE: { easy: 0.25, normal: 0.56, hard: 0.86, randomMin: 0.25, randomMax: 0.9 },
  CLICK_TARGETS: { easy: 0.2, normal: 0.5, hard: 0.8, randomMin: 0.2, randomMax: 0.85 },
  TIMING_BAR: { easy: 0.26, normal: 0.55, hard: 0.82, randomMin: 0.25, randomMax: 0.85 },
  COLLECT_AND_ESCAPE: { easy: 0.25, normal: 0.56, hard: 0.86, randomMin: 0.25, randomMax: 0.88 },
  MICRO_ARENA_KO: { easy: 0.32, normal: 0.62, hard: 0.9, randomMin: 0.3, randomMax: 0.9 },
  BREAKOUT_MICRO: { easy: 0.2, normal: 0.5, hard: 0.8, randomMin: 0.2, randomMax: 0.85 },
  WHACK_A_MOLE_CLICKER: { easy: 0.2, normal: 0.5, hard: 0.8, randomMin: 0.2, randomMax: 0.85 },
  LANE_DODGER: { easy: 0.25, normal: 0.56, hard: 0.86, randomMin: 0.25, randomMax: 0.9 },
  AIM_TRAINER_FLICK: { easy: 0.2, normal: 0.5, hard: 0.8, randomMin: 0.2, randomMax: 0.85 }
};

export const GAMEGRID_PRESET_PACKS: Record<MinigameTemplateId, TemplatePresetPack[]> = {
  BUTTON_MASH_RACE: [
    {
      id: "steady-charge",
      label: "Steady Charge",
      description: "Relaxed mash with a gentle meter.",
      difficulty: "easy",
      ramp: 0.3,
      modifiers: ["confettiOnSuccess"]
    },
    {
      id: "turbo-burst",
      label: "Turbo Burst",
      description: "Fast fill and high stakes.",
      difficulty: "hard",
      ramp: 0.8,
      modifiers: ["speedyMeter", "pulsatingLights"]
    }
  ],
  DODGE_SURVIVE: [
    {
      id: "floaty-escape",
      label: "Floaty Escape",
      description: "Breathing room and softer hazards.",
      difficulty: "easy",
      ramp: 0.35,
      modifiers: ["lowGravity", "confettiOnSuccess"]
    },
    {
      id: "hazard-surge",
      label: "Hazard Surge",
      description: "Pressure cooker with bursts.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["spawnBurstEvery10s", "pulsatingLights"]
    }
  ],
  CLICK_TARGETS: [
    {
      id: "soft-focus",
      label: "Soft Focus",
      description: "Big targets, calm pace.",
      difficulty: "easy",
      ramp: 0.25,
      modifiers: ["bigTargets", "confettiOnSuccess"]
    },
    {
      id: "precision-rush",
      label: "Precision Rush",
      description: "Small targets and quick spawns.",
      difficulty: "hard",
      ramp: 0.8,
      modifiers: ["smallTargets", "jitteryTargets"]
    }
  ],
  TIMING_BAR: [
    {
      id: "rhythm-practice",
      label: "Rhythm Practice",
      description: "Wider timing window, steady pace.",
      difficulty: "easy",
      ramp: 0.3,
      modifiers: ["confettiOnSuccess"]
    },
    {
      id: "needle-blaze",
      label: "Needle Blaze",
      description: "Tighter timings, turbo needle.",
      difficulty: "hard",
      ramp: 0.75,
      modifiers: ["fastNeedle", "pulsatingLights"]
    }
  ],
  COLLECT_AND_ESCAPE: [
    {
      id: "safe-route",
      label: "Safe Route",
      description: "Fewer hazards, forgiving pathing.",
      difficulty: "easy",
      ramp: 0.35,
      modifiers: ["confettiOnSuccess"]
    },
    {
      id: "panic-run",
      label: "Panic Run",
      description: "Extra hazards with tighter exits.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["extraHazardsButSlower", "pulsatingLights"]
    }
  ],
  MICRO_ARENA_KO: [
    {
      id: "bounce-brawl",
      label: "Bounce Brawl",
      description: "Floaty, bouncy arena chaos.",
      difficulty: "normal",
      ramp: 0.6,
      modifiers: ["bouncePhysics", "pulsatingLights"]
    },
    {
      id: "heavy-hitters",
      label: "Heavy Hitters",
      description: "Tighter arena pressure.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["heavyPlayer", "confettiOnSuccess"]
    }
  ],
  BREAKOUT_MICRO: [
    {
      id: "clean-break",
      label: "Clean Break",
      description: "Wider paddle and easier clears.",
      difficulty: "easy",
      ramp: 0.3,
      modifiers: ["paddleSizeScale", "confettiOnSuccess"]
    },
    {
      id: "spin-cycle",
      label: "Spin Cycle",
      description: "Faster ball with tighter control.",
      difficulty: "hard",
      ramp: 0.8,
      modifiers: ["ballSpeedScale", "pulsatingLights"]
    }
  ],
  WHACK_A_MOLE_CLICKER: [
    {
      id: "friendly-moles",
      label: "Friendly Moles",
      description: "Bigger targets, slower spawns.",
      difficulty: "easy",
      ramp: 0.25,
      modifiers: ["targetSizeScale", "confettiOnSuccess"]
    },
    {
      id: "combo-rush",
      label: "Combo Rush",
      description: "Tight combos and frantic pace.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["comboWindowTight", "pulsatingLights"]
    }
  ],
  LANE_DODGER: [
    {
      id: "smooth-lanes",
      label: "Smooth Lanes",
      description: "Readable lanes with chill speed.",
      difficulty: "easy",
      ramp: 0.3,
      modifiers: ["confettiOnSuccess"]
    },
    {
      id: "traffic-jam",
      label: "Traffic Jam",
      description: "Fast lanes, dense spawns.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["laneSpeedScale", "pulsatingLights"]
    }
  ],
  AIM_TRAINER_FLICK: [
    {
      id: "warm-flicks",
      label: "Warm Flicks",
      description: "Larger targets and slower shrink.",
      difficulty: "easy",
      ramp: 0.3,
      modifiers: ["targetSizeScale", "confettiOnSuccess"]
    },
    {
      id: "flick-storm",
      label: "Flick Storm",
      description: "Targets shrink fast, no mercy.",
      difficulty: "hard",
      ramp: 0.85,
      modifiers: ["pulsatingLights"]
    }
  ]
};

export const GAMEGRID_TEMPLATE_HELP: Record<MinigameTemplateId, TemplateHelp> = {
  BUTTON_MASH_RACE: {
    headline: "Button Mash Race",
    summary: "Fill the meter before time runs out.",
    tips: ["Keep the meter target reachable for newcomers.", "Pace tweaks swing difficulty fast."],
    controls: ["Space / A / D"]
  },
  DODGE_SURVIVE: {
    headline: "Dodge Survive",
    summary: "Survive the full 30 seconds.",
    tips: ["Hazard speed and spawn rate multiply quickly.", "Avoid stacking high spawn with tiny arenas."],
    controls: ["WASD / Arrow Keys"]
  },
  CLICK_TARGETS: {
    headline: "Click Targets",
    summary: "Pop targets against the clock.",
    tips: ["Target size + spawn interval define fairness.", "Mix jitter with care for precision builds."],
    controls: ["Mouse Click"]
  },
  TIMING_BAR: {
    headline: "Timing Bar",
    summary: "Hit perfect timing windows.",
    tips: ["Green zone size is the biggest difficulty lever.", "Fast needle + tiny zone gets brutal."],
    controls: ["Space"]
  },
  COLLECT_AND_ESCAPE: {
    headline: "Collect & Escape",
    summary: "Collect items then reach the exit.",
    tips: ["Exit size + hazard speed tune stress.", "Keep movement speed readable."],
    controls: ["WASD / Arrow Keys"]
  },
  MICRO_ARENA_KO: {
    headline: "Micro Arena KO",
    summary: "Knock rivals out of a tiny arena.",
    tips: ["Enemy speed + count define chaos.", "Player speed too low can feel sluggish."],
    controls: ["WASD / Arrow Keys"]
  },
  BREAKOUT_MICRO: {
    headline: "Breakout Micro",
    summary: "Clear bricks with the paddle.",
    tips: ["Ball speed and paddle width must stay balanced.", "Higher brick counts raise tension."],
    controls: ["A/D or Mouse"]
  },
  WHACK_A_MOLE_CLICKER: {
    headline: "Whack-a-Mole",
    summary: "Whack targets before they hide.",
    tips: ["Combo window and spawn interval drive pace.", "Smaller targets feel much harder."],
    controls: ["Mouse Click"]
  },
  LANE_DODGER: {
    headline: "Lane Dodger",
    summary: "Slide lanes to dodge hazards.",
    tips: ["Lane speed + spawn interval must stay fair.", "Ramp higher for expert runs."],
    controls: ["A/D or Arrow Keys"]
  },
  AIM_TRAINER_FLICK: {
    headline: "Aim Trainer",
    summary: "Flick to hit shrinking targets.",
    tips: ["Shrink rate + target size set the skill ceiling.", "Keep early builds forgiving."],
    controls: ["Mouse Click"]
  }
};

const objective = (label: string, description: string, apply: ObjectiveOption["apply"]) => ({
  id: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  description,
  apply
});

export const GAMEGRID_OBJECTIVES: Record<MinigameTemplateId, { win: ObjectiveOption[]; lose: ObjectiveOption[] }> = {
  BUTTON_MASH_RACE: {
    win: [
      objective("Fill The Meter", "Hit the target before the timer ends.", (spec) => ({
        ...spec,
        winCondition: { type: "meter", target: spec.params.meterTarget }
      }))
    ],
    lose: [objective("Timer Runs Out", "Time hits zero.", (spec) => ({ ...spec, loseCondition: { type: "timer" } }))]
  },
  DODGE_SURVIVE: {
    win: [
      objective("Survive 30s", "Stay alive the whole round.", (spec) => ({
        ...spec,
        winCondition: { type: "survive", target: 30 }
      }))
    ],
    lose: [
      objective("Max Hits", "Three hits ends the round.", (spec) => ({
        ...spec,
        loseCondition: { type: "hits", maxMisses: spec.params.maxHits }
      }))
    ]
  },
  CLICK_TARGETS: {
    win: [
      objective("Pop 16", "Warm-up speed run.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 16 },
        winCondition: { type: "targets", target: 16 }
      })),
      objective("Pop 20", "Classic pressure test.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 20 },
        winCondition: { type: "targets", target: 20 }
      })),
      objective("Pop 24", "For the fast hands.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 24 },
        winCondition: { type: "targets", target: 24 }
      }))
    ],
    lose: [objective("Timer Runs Out", "Time hits zero.", (spec) => ({ ...spec, loseCondition: { type: "timer" } }))]
  },
  TIMING_BAR: {
    win: [
      objective("5 Perfects", "Quick precision push.", (spec) => ({
        ...spec,
        params: { ...spec.params, requiredHits: 5 },
        winCondition: { type: "perfects", target: 5 }
      })),
      objective("7 Perfects", "Core rhythm test.", (spec) => ({
        ...spec,
        params: { ...spec.params, requiredHits: 7 },
        winCondition: { type: "perfects", target: 7 }
      })),
      objective("9 Perfects", "No-mistake energy.", (spec) => ({
        ...spec,
        params: { ...spec.params, requiredHits: 9 },
        winCondition: { type: "perfects", target: 9 }
      }))
    ],
    lose: [
      objective("3 Misses", "Strict but fair.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 3 },
        loseCondition: { type: "misses", maxMisses: 3 }
      })),
      objective("5 Misses", "Standard tolerance.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 5 },
        loseCondition: { type: "misses", maxMisses: 5 }
      })),
      objective("7 Misses", "Very forgiving.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 7 },
        loseCondition: { type: "misses", maxMisses: 7 }
      }))
    ]
  },
  COLLECT_AND_ESCAPE: {
    win: [
      objective("Collect & Escape", "Grab all items then exit.", (spec) => ({
        ...spec,
        winCondition: { type: "collect_exit", target: spec.params.itemsToCollect }
      }))
    ],
    lose: [
      objective("2 Hits", "Two hits ends the run.", (spec) => ({
        ...spec,
        loseCondition: { type: "hits", maxMisses: 2 }
      }))
    ]
  },
  MICRO_ARENA_KO: {
    win: [
      objective("5 KOs", "Knock out the arena crew.", (spec) => ({
        ...spec,
        winCondition: { type: "kos", target: spec.params.kosToWin }
      }))
    ],
    lose: [
      objective("2 Falls", "Two knockouts and you're done.", (spec) => ({
        ...spec,
        loseCondition: { type: "falls", maxMisses: spec.params.knockoutLimit }
      }))
    ]
  },
  BREAKOUT_MICRO: {
    win: [
      objective("Break 10", "Quick clear challenge.", (spec) => ({
        ...spec,
        params: { ...spec.params, bricksToClear: 10 },
        winCondition: { type: "bricks", target: 10 }
      })),
      objective("Break 14", "Classic breakout sprint.", (spec) => ({
        ...spec,
        params: { ...spec.params, bricksToClear: 14 },
        winCondition: { type: "bricks", target: 14 }
      })),
      objective("Break 18", "Longer, spicier clear.", (spec) => ({
        ...spec,
        params: { ...spec.params, bricksToClear: 18 },
        winCondition: { type: "bricks", target: 18 }
      }))
    ],
    lose: [
      objective("2 Misses", "Super strict.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 2 },
        loseCondition: { type: "misses", maxMisses: 2 }
      })),
      objective("3 Misses", "Standard.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 3 },
        loseCondition: { type: "misses", maxMisses: 3 }
      })),
      objective("4 Misses", "More forgiving.", (spec) => ({
        ...spec,
        params: { ...spec.params, maxMisses: 4 },
        loseCondition: { type: "misses", maxMisses: 4 }
      }))
    ]
  },
  WHACK_A_MOLE_CLICKER: {
    win: [
      objective("Hit 18", "Warm-up frenzy.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 18 },
        winCondition: { type: "hits", target: 18 }
      })),
      objective("Hit 22", "Classic whack pace.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 22 },
        winCondition: { type: "hits", target: 22 }
      })),
      objective("Hit 26", "Fastest fingers.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 26 },
        winCondition: { type: "hits", target: 26 }
      }))
    ],
    lose: [objective("Timer Runs Out", "Time hits zero.", (spec) => ({ ...spec, loseCondition: { type: "timer" } }))]
  },
  LANE_DODGER: {
    win: [
      objective("Survive 30s", "Stay alive the whole round.", (spec) => ({
        ...spec,
        winCondition: { type: "survive", target: 30 }
      }))
    ],
    lose: [
      objective("Max Hits", "Three hits ends the round.", (spec) => ({
        ...spec,
        loseCondition: { type: "hits", maxMisses: spec.params.maxHits }
      }))
    ]
  },
  AIM_TRAINER_FLICK: {
    win: [
      objective("Hit 16", "Warm-up flicks.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 16 },
        winCondition: { type: "hits", target: 16 }
      })),
      objective("Hit 20", "Classic trainer.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 20 },
        winCondition: { type: "hits", target: 20 }
      })),
      objective("Hit 24", "High pressure.", (spec) => ({
        ...spec,
        params: { ...spec.params, targetCount: 24 },
        winCondition: { type: "hits", target: 24 }
      }))
    ],
    lose: [objective("Timer Runs Out", "Time hits zero.", (spec) => ({ ...spec, loseCondition: { type: "timer" } }))]
  }
};

export const getTemplateDifficultyCurve = (templateId: MinigameTemplateId) =>
  TEMPLATE_DIFFICULTY_CURVES[templateId];

const difficultyToValue = (templateId: MinigameTemplateId, preset: DifficultyPreset) => {
  const curve = getTemplateDifficultyCurve(templateId);
  if (preset === "easy") return curve.easy;
  if (preset === "hard") return curve.hard;
  return curve.normal;
};

const applyPacing = (spec: MinigameSpec, ramp: number) => {
  const intensity = Math.max(0, Math.min(1, ramp));
  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  const adjusted = { ...spec, params: { ...spec.params } };
  const paceMap = TEMPLATE_DIFFICULTY_DIRECTIONS[spec.templateId] ?? {};

  for (const [key, direction] of Object.entries(paceMap)) {
    const current = adjusted.params[key];
    const range = ranges[key];
    if (typeof current !== "number" || !range) continue;
    const chillFactor = direction === "up" ? 0.85 : 1.2;
    const hotFactor = direction === "up" ? 1.25 : 0.75;
    const target = current * (chillFactor + (hotFactor - chillFactor) * intensity);
    adjusted.params[key] = Math.max(range.min, Math.min(range.max, target));
  }

  return adjusted;
};

export const generateGoofyTitle = (seed?: string) => {
  const rng = new SeededRng(seed ?? randomSeed());
  const adjectives = [
    "Neon",
    "Turbo",
    "Spicy",
    "Glitchy",
    "Hyper",
    "Cosmic",
    "Wobbly",
    "Laser",
    "Spark",
    "Pixel",
    "Bubble",
    "Rogue",
    "Snacky",
    "Rocket"
  ];
  const nouns = [
    "Button",
    "Hamster",
    "Bean",
    "Pancake",
    "Rocket",
    "Noodle",
    "Disco",
    "Sprinter",
    "Galaxy",
    "Gremlin",
    "Jelly",
    "Slime",
    "Waffle"
  ];
  const panics = ["Panic", "Rush", "Sprint", "Dash", "Rumble", "Frenzy", "Scramble", "Shuffle"];
  return `${rng.pick(adjectives)} ${rng.pick(nouns)} ${rng.pick(panics)}`;
};

export const buildGamegridSpec = (options: {
  seed?: string;
  templateId: MinigameTemplateId;
  difficulty: DifficultyPreset;
  ramp: number;
  winObjectiveId?: string;
  loseObjectiveId?: string;
  modifiers: string[];
  paletteId: string;
  title: string;
  description?: string | null;
}) => {
  const seed = options.seed ?? randomSeed();
  const palette = getPaletteById(options.paletteId);
  const base = TEMPLATE_MAP[options.templateId].buildSpec(
    seed,
    difficultyToValue(options.templateId, options.difficulty),
    palette.theme
  );

  let next: MinigameSpec = {
    ...base,
    title: options.title || base.title,
    tagline: base.tagline,
    instructions: base.instructions
  };

  const objectiveSet = GAMEGRID_OBJECTIVES[options.templateId];
  const winOption = objectiveSet.win.find((option) => option.id === options.winObjectiveId) ?? objectiveSet.win[0];
  const loseOption = objectiveSet.lose.find((option) => option.id === options.loseObjectiveId) ?? objectiveSet.lose[0];
  if (winOption) next = winOption.apply(next);
  if (loseOption) next = loseOption.apply(next);

  next = applyPacing(next, options.ramp);

  const rng = new SeededRng(`${seed}:GAMEGRID_MODIFIERS`);
  next = applyModifiers(next, rng, options.modifiers);
  next.modifiers = options.modifiers;

  return next;
};

export const getCompatibleModifiers = (templateId: MinigameTemplateId) => {
  const dummy = TEMPLATE_MAP[templateId].buildSpec("compat", 0.5, THEME_PALETTES[0].theme);
  return filterCompatibleModifiers(dummy);
};

export const estimateDifficultyLabel = (spec: MinigameSpec) => {
  return estimateDifficultyScore(spec).label;
};

export const estimateDifficultyScore = (spec: MinigameSpec): DifficultyScore => {
  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  const directions = TEMPLATE_DIFFICULTY_DIRECTIONS[spec.templateId] ?? {};
  const keys = Object.keys(ranges);
  if (keys.length === 0) return { score: 50, label: "Normal" };
  const scores = keys.map((key) => {
    const range = ranges[key];
    const value = spec.params[key];
    if (range.max === range.min) return 0.5;
    if (typeof value !== "number") return 0.5;
    const normalized = (value - range.min) / (range.max - range.min);
    const direction = directions[key] ?? "up";
    return direction === "down" ? 1 - normalized : normalized;
  });
  const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
  const score = Math.round(avg * 100);
  if (avg >= 0.7) return { score, label: "Hard" };
  if (avg <= 0.35) return { score, label: "Easy" };
  return { score, label: "Normal" };
};

export const getTemplatePresetPacks = (templateId: MinigameTemplateId) =>
  GAMEGRID_PRESET_PACKS[templateId] ?? [];

export const generateGamegridThumbnail = (options: {
  title: string;
  templateId: MinigameTemplateId;
  paletteId: string;
}) => {
  const palette = getPaletteById(options.paletteId);
  const iconMap: Record<MinigameTemplateId, string> = {
    BUTTON_MASH_RACE: "⌨️",
    DODGE_SURVIVE: "🛡️",
    CLICK_TARGETS: "🎯",
    TIMING_BAR: "⏱️",
    COLLECT_AND_ESCAPE: "💎",
    MICRO_ARENA_KO: "⚔️",
    BREAKOUT_MICRO: "🧱",
    WHACK_A_MOLE_CLICKER: "🔨",
    LANE_DODGER: "🛣️",
    AIM_TRAINER_FLICK: "✨"
  };
  const icon = iconMap[options.templateId] ?? "🎮";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<defs>
<linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
<stop offset="0%" stop-color="${palette.colors.background}"/>
<stop offset="100%" stop-color="${palette.colors.accentSoft}"/>
</linearGradient>
</defs>
<rect width="640" height="360" rx="28" fill="url(#g)"/>
<circle cx="520" cy="90" r="52" fill="rgba(255,255,255,0.18)"/>
<circle cx="120" cy="280" r="42" fill="rgba(255,255,255,0.12)"/>
<text x="40" y="160" font-family="Space Grotesk, sans-serif" font-size="44" fill="${palette.colors.text}" font-weight="700">${options.title}</text>
<text x="40" y="220" font-family="IBM Plex Sans, sans-serif" font-size="22" fill="${palette.colors.text}">${icon} ${options.templateId.replace(/_/g, " ")}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
