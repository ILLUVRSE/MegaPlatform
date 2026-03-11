export type MinigameTemplateId =
  | "BUTTON_MASH_RACE"
  | "DODGE_SURVIVE"
  | "CLICK_TARGETS"
  | "TIMING_BAR"
  | "COLLECT_AND_ESCAPE"
  | "MICRO_ARENA_KO"
  | "BREAKOUT_MICRO"
  | "WHACK_A_MOLE_CLICKER"
  | "LANE_DODGER"
  | "AIM_TRAINER_FLICK";

export type MinigameTheme = {
  palette: string;
  bgStyle: string;
  sfxStyle: string;
  particles: string;
};

export type InputSchema = {
  keys: string[];
  mouse: {
    enabled: boolean;
  };
};

export type WinCondition = {
  type: string;
  target?: number;
};

export type LoseCondition = {
  type: string;
  maxMisses?: number;
};

export type MinigameSpec = {
  id: string;
  seed: string;
  templateId: MinigameTemplateId;
  title: string;
  tagline: string;
  instructions: string;
  durationSeconds: 30;
  inputSchema: InputSchema;
  winCondition: WinCondition;
  loseCondition: LoseCondition;
  scoring: {
    mode: "winlose";
  };
  theme: MinigameTheme;
  params: Record<string, number>;
  modifiers: string[];
};

export type ParamRange = { min: number; max: number };
export type TemplateParamRanges = Record<MinigameTemplateId, Record<string, ParamRange>>;
export type DifficultyDirection = "up" | "down";

export const TEMPLATE_PARAM_RANGES: TemplateParamRanges = {
  BUTTON_MASH_RACE: {
    meterTarget: { min: 100, max: 100 },
    mashPerPress: { min: 0.6, max: 1.4 },
    decayPerSecond: { min: 0, max: 3.2 }
  },
  DODGE_SURVIVE: {
    maxHits: { min: 3, max: 3 },
    hazardSpeed: { min: 120, max: 240 },
    hazardSize: { min: 18, max: 34 },
    spawnRate: { min: 0.7, max: 1.6 },
    spawnRamp: { min: 0.2, max: 0.6 },
    playerSpeed: { min: 180, max: 260 }
  },
  CLICK_TARGETS: {
    targetCount: { min: 16, max: 26 },
    targetSize: { min: 22, max: 46 },
    spawnInterval: { min: 0.45, max: 1.2 },
    missPenaltySeconds: { min: 0.8, max: 2.2 }
  },
  TIMING_BAR: {
    requiredHits: { min: 5, max: 9 },
    needleSpeed: { min: 1.2, max: 2.4 },
    greenZoneSize: { min: 0.12, max: 0.24 },
    maxMisses: { min: 3, max: 7 }
  },
  COLLECT_AND_ESCAPE: {
    itemsToCollect: { min: 10, max: 10 },
    hazardCount: { min: 2, max: 4 },
    hazardSpeed: { min: 80, max: 140 },
    playerSpeed: { min: 180, max: 240 },
    exitSize: { min: 80, max: 130 }
  },
  MICRO_ARENA_KO: {
    kosToWin: { min: 5, max: 5 },
    enemyCount: { min: 5, max: 7 },
    enemySpeed: { min: 90, max: 150 },
    playerSpeed: { min: 180, max: 250 },
    knockoutLimit: { min: 2, max: 2 }
  },
  BREAKOUT_MICRO: {
    bricksToClear: { min: 10, max: 18 },
    paddleWidth: { min: 120, max: 220 },
    ballSpeed: { min: 180, max: 320 },
    maxMisses: { min: 2, max: 4 }
  },
  WHACK_A_MOLE_CLICKER: {
    targetCount: { min: 18, max: 28 },
    targetSize: { min: 48, max: 82 },
    spawnInterval: { min: 0.35, max: 0.8 },
    comboWindow: { min: 0.5, max: 1.2 }
  },
  LANE_DODGER: {
    laneSpeed: { min: 180, max: 300 },
    spawnInterval: { min: 0.4, max: 0.9 },
    maxHits: { min: 3, max: 3 }
  },
  AIM_TRAINER_FLICK: {
    targetCount: { min: 16, max: 26 },
    targetSize: { min: 36, max: 70 },
    shrinkRate: { min: 0.7, max: 1.4 },
    spawnInterval: { min: 0.35, max: 0.75 }
  }
};

export const TEMPLATE_DIFFICULTY_DIRECTIONS: Record<
  MinigameTemplateId,
  Record<string, DifficultyDirection>
> = {
  BUTTON_MASH_RACE: { mashPerPress: "down", decayPerSecond: "up" },
  DODGE_SURVIVE: {
    hazardSpeed: "up",
    hazardSize: "up",
    spawnRate: "up",
    spawnRamp: "up",
    playerSpeed: "down"
  },
  CLICK_TARGETS: { spawnInterval: "down", targetSize: "down", missPenaltySeconds: "up" },
  TIMING_BAR: { needleSpeed: "up", greenZoneSize: "down", requiredHits: "up", maxMisses: "down" },
  COLLECT_AND_ESCAPE: { hazardCount: "up", hazardSpeed: "up", playerSpeed: "down", exitSize: "down" },
  MICRO_ARENA_KO: { enemyCount: "up", enemySpeed: "up", playerSpeed: "down" },
  BREAKOUT_MICRO: { ballSpeed: "up", paddleWidth: "down", bricksToClear: "up", maxMisses: "down" },
  WHACK_A_MOLE_CLICKER: { spawnInterval: "down", targetSize: "down", comboWindow: "down" },
  LANE_DODGER: { laneSpeed: "up", spawnInterval: "down" },
  AIM_TRAINER_FLICK: { shrinkRate: "up", targetSize: "down", spawnInterval: "down" }
};

export const TEMPLATE_INPUT_SCHEMAS: Record<MinigameTemplateId, InputSchema> = {
  BUTTON_MASH_RACE: { keys: ["Space", "KeyA", "KeyD"], mouse: { enabled: false } },
  DODGE_SURVIVE: {
    keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
    mouse: { enabled: false }
  },
  CLICK_TARGETS: { keys: [], mouse: { enabled: true } },
  TIMING_BAR: { keys: ["Space"], mouse: { enabled: false } },
  COLLECT_AND_ESCAPE: {
    keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
    mouse: { enabled: false }
  },
  MICRO_ARENA_KO: {
    keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
    mouse: { enabled: false }
  },
  BREAKOUT_MICRO: { keys: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"], mouse: { enabled: true } },
  WHACK_A_MOLE_CLICKER: { keys: [], mouse: { enabled: true } },
  LANE_DODGER: { keys: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"], mouse: { enabled: false } },
  AIM_TRAINER_FLICK: { keys: [], mouse: { enabled: true } }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateMinigameSpec(spec: MinigameSpec): ValidationResult {
  const errors: string[] = [];
  if (spec.durationSeconds !== 30) {
    errors.push("durationSeconds must be exactly 30.");
  }
  if (!spec.winCondition || !spec.winCondition.type) {
    errors.push("winCondition is required.");
  }
  if (!spec.loseCondition || !spec.loseCondition.type) {
    errors.push("loseCondition is required.");
  }
  if (!spec.inputSchema || !Array.isArray(spec.inputSchema.keys)) {
    errors.push("inputSchema.keys is required.");
  }
  const expectedInput = TEMPLATE_INPUT_SCHEMAS[spec.templateId];
  if (expectedInput) {
    const keysMatch =
      spec.inputSchema &&
      Array.isArray(spec.inputSchema.keys) &&
      spec.inputSchema.keys.length === expectedInput.keys.length &&
      spec.inputSchema.keys.every((key, idx) => key === expectedInput.keys[idx]);
    const mouseMatch = spec.inputSchema?.mouse?.enabled === expectedInput.mouse.enabled;
    if (!keysMatch || !mouseMatch) {
      errors.push("inputSchema must match template controls.");
    }
  }

  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  if (!ranges) {
    errors.push(`Unknown templateId: ${spec.templateId}`);
  } else {
    const params = spec.params ?? {};
    for (const [key, value] of Object.entries(params)) {
      if (!isFiniteNumber(value)) {
        errors.push(`Param ${key} must be a finite number.`);
        continue;
      }
      const range = ranges[key];
      if (!range) {
        errors.push(`Param ${key} is not allowed for template ${spec.templateId}.`);
        continue;
      }
      if (value < range.min || value > range.max) {
        errors.push(`Param ${key} must be within ${range.min}-${range.max}.`);
      }
    }
    for (const key of Object.keys(ranges)) {
      if (!(key in params)) {
        errors.push(`Param ${key} is required for template ${spec.templateId}.`);
      }
    }
  }

  if (spec.modifiers?.length) {
    for (const modifier of spec.modifiers) {
      if (typeof modifier !== "string" || !modifier.trim()) {
        errors.push("modifier ids must be non-empty strings.");
      }
    }
    if (spec.modifiers.length > 3) {
      errors.push("No more than 3 modifiers are allowed.");
    }
  }

  if (spec.templateId === "CLICK_TARGETS") {
    const targetSize = spec.params?.targetSize;
    const targetCount = spec.params?.targetCount;
    const hasSmall = spec.modifiers.includes("smallTargets");
    const hasJitter = spec.modifiers.includes("jitteryTargets");
    if (hasSmall && hasJitter && targetSize < 28 && targetCount >= 20) {
      errors.push("Target size too small for jittery targets at full quota.");
    }
  }

  if (spec.templateId === "TIMING_BAR") {
    const hits = spec.params?.requiredHits;
    const zone = spec.params?.greenZoneSize;
    const fastNeedle = spec.modifiers.includes("fastNeedle");
    if (fastNeedle && hits >= 8 && zone <= 0.14) {
      errors.push("Timing bar too strict with fast needle and tiny green zone.");
    }
  }

  if (spec.templateId === "DODGE_SURVIVE") {
    const spawnRate = spec.params?.spawnRate;
    if (spec.modifiers.includes("extraHazardsButSlower") && spawnRate > 1.5) {
      errors.push("Hazard spawn rate too high for extra hazards modifier.");
    }
  }

  if (spec.templateId === "BREAKOUT_MICRO") {
    const paddleWidth = spec.params?.paddleWidth;
    const ballSpeed = spec.params?.ballSpeed;
    if (paddleWidth < 140 && ballSpeed > 280) {
      errors.push("Breakout too harsh with tiny paddle and fast ball.");
    }
  }

  if (spec.templateId === "WHACK_A_MOLE_CLICKER") {
    const targetSize = spec.params?.targetSize;
    const targetCount = spec.params?.targetCount;
    if (targetSize < 56 && targetCount > 24) {
      errors.push("Whack-a-mole too strict with tiny targets and high quota.");
    }
  }

  if (spec.templateId === "AIM_TRAINER_FLICK") {
    const targetSize = spec.params?.targetSize;
    const shrinkRate = spec.params?.shrinkRate;
    if (targetSize < 40 && shrinkRate > 1.2) {
      errors.push("Aim trainer too strict with tiny targets and fast shrink.");
    }
  }

  if (spec.templateId === "LANE_DODGER") {
    const laneSpeed = spec.params?.laneSpeed;
    const spawnInterval = spec.params?.spawnInterval;
    if (laneSpeed > 280 && spawnInterval < 0.5) {
      errors.push("Lane dodger too fast with dense spawns.");
    }
  }

  return { ok: errors.length === 0, errors };
}
