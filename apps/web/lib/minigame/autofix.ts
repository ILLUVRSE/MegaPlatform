import type { InputSchema, LoseCondition, MinigameSpec, MinigameTemplateId, WinCondition } from "./spec";
import { TEMPLATE_PARAM_RANGES } from "./spec";
import { getPaletteById } from "./theme";
import { filterCompatibleModifiers, MODIFIERS } from "./modifiers";

export type AutoFixChange = {
  path: string;
  before: unknown;
  after: unknown;
  reason: string;
};

export type AutoFixResult = {
  spec: MinigameSpec;
  warnings: string[];
  changes: AutoFixChange[];
  changed: boolean;
};

const TEMPLATE_INPUT_SCHEMA: Record<MinigameTemplateId, InputSchema> = {
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

const DEFAULT_CONDITIONS: Record<MinigameTemplateId, { win: WinCondition; lose: LoseCondition }> = {
  BUTTON_MASH_RACE: { win: { type: "meter", target: 100 }, lose: { type: "timer" } },
  DODGE_SURVIVE: { win: { type: "survive", target: 30 }, lose: { type: "hits", maxMisses: 3 } },
  CLICK_TARGETS: { win: { type: "targets", target: 20 }, lose: { type: "timer" } },
  TIMING_BAR: { win: { type: "perfects", target: 6 }, lose: { type: "misses", maxMisses: 5 } },
  COLLECT_AND_ESCAPE: { win: { type: "collect_exit", target: 10 }, lose: { type: "hits", maxMisses: 2 } },
  MICRO_ARENA_KO: { win: { type: "kos", target: 5 }, lose: { type: "falls", maxMisses: 2 } },
  BREAKOUT_MICRO: { win: { type: "bricks", target: 14 }, lose: { type: "misses", maxMisses: 3 } },
  WHACK_A_MOLE_CLICKER: { win: { type: "hits", target: 22 }, lose: { type: "timer" } },
  LANE_DODGER: { win: { type: "survive", target: 30 }, lose: { type: "hits", maxMisses: 3 } },
  AIM_TRAINER_FLICK: { win: { type: "hits", target: 20 }, lose: { type: "timer" } }
};

const TARGET_PARAM_MAP: Partial<Record<MinigameTemplateId, keyof MinigameSpec["params"]>> = {
  BUTTON_MASH_RACE: "meterTarget",
  CLICK_TARGETS: "targetCount",
  TIMING_BAR: "requiredHits",
  COLLECT_AND_ESCAPE: "itemsToCollect",
  MICRO_ARENA_KO: "kosToWin",
  BREAKOUT_MICRO: "bricksToClear",
  WHACK_A_MOLE_CLICKER: "targetCount",
  AIM_TRAINER_FLICK: "targetCount"
};

const LOSE_PARAM_MAP: Partial<Record<MinigameTemplateId, keyof MinigameSpec["params"]>> = {
  DODGE_SURVIVE: "maxHits",
  TIMING_BAR: "maxMisses",
  BREAKOUT_MICRO: "maxMisses",
  MICRO_ARENA_KO: "knockoutLimit",
  LANE_DODGER: "maxHits"
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const INTEGER_PARAMS = new Set([
  "meterTarget",
  "targetCount",
  "requiredHits",
  "maxMisses",
  "itemsToCollect",
  "hazardCount",
  "kosToWin",
  "enemyCount",
  "knockoutLimit",
  "bricksToClear",
  "maxHits"
]);

const pushChange = (
  changes: AutoFixChange[],
  path: string,
  before: unknown,
  after: unknown,
  reason: string
) => {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  changes.push({ path, before, after, reason });
};

const ensureParams = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  const nextParams: Record<string, number> = {};
  let changed = false;
  for (const [key, range] of Object.entries(ranges)) {
    const raw = spec.params?.[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      nextParams[key] = (range.min + range.max) / 2;
      warnings.push(`Filled missing ${key} with safe default.`);
      pushChange(changes, `params.${key}`, raw, nextParams[key], "Filled missing parameter.");
      changed = true;
      continue;
    }
    let clamped = clamp(raw, range.min, range.max);
    if (INTEGER_PARAMS.has(key)) {
      clamped = Math.round(clamped);
    }
    if (clamped !== raw) {
      warnings.push(`Clamped ${key} to ${clamped}.`);
      pushChange(changes, `params.${key}`, raw, clamped, "Clamped to allowed range.");
      changed = true;
    }
    nextParams[key] = clamped;
  }

  const extraKeys = Object.keys(spec.params ?? {}).filter((key) => !ranges[key]);
  if (extraKeys.length) {
    warnings.push(`Removed unsupported params: ${extraKeys.join(", ")}.`);
    for (const extraKey of extraKeys) {
      pushChange(
        changes,
        `params.${extraKey}`,
        spec.params?.[extraKey],
        null,
        "Removed unsupported parameter."
      );
    }
    changed = true;
  }

  return { params: nextParams, changed };
};

const ensureModifiers = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const unique = Array.from(new Set((spec.modifiers ?? []).filter((id) => typeof id === "string" && id.trim())));
  const known = new Set(MODIFIERS.map((modifier) => modifier.id));
  let filtered = unique.filter((id) => known.has(id));

  const compatible = new Set(filterCompatibleModifiers(spec).map((modifier) => modifier.id));
  const incompatible = filtered.filter((id) => !compatible.has(id));
  if (incompatible.length) {
    warnings.push(`Removed incompatible modifiers: ${incompatible.join(", ")}.`);
    filtered = filtered.filter((id) => compatible.has(id));
  }

  const conflicts: Array<[string, string]> = [
    ["bigTargets", "smallTargets"],
    ["comboWindowTight", "targetSizeScale"]
  ];
  for (const [a, b] of conflicts) {
    if (filtered.includes(a) && filtered.includes(b)) {
      filtered = filtered.filter((id) => id !== b);
      warnings.push(`Removed conflicting modifier: ${b}.`);
    }
  }

  if (filtered.length > 3) {
    warnings.push("Trimmed modifiers to the first 3 selections.");
    filtered = filtered.slice(0, 3);
  }

  if (filtered.join("|") !== unique.join("|")) {
    pushChange(changes, "modifiers", unique, filtered, "Adjusted modifiers for compatibility.");
  }

  return { modifiers: filtered, changed: filtered.join("|") !== unique.join("|") };
};

const ensureInputSchema = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const expected = TEMPLATE_INPUT_SCHEMA[spec.templateId];
  const current = spec.inputSchema;
  const sameKeys =
    current &&
    Array.isArray(current.keys) &&
    current.keys.length === expected.keys.length &&
    current.keys.every((key, idx) => key === expected.keys[idx]);
  const sameMouse = current?.mouse?.enabled === expected.mouse.enabled;
  if (!sameKeys || !sameMouse) {
    warnings.push("Adjusted input schema to match template controls.");
    pushChange(changes, "inputSchema", current, expected, "Aligned controls to template.");
    return { inputSchema: expected, changed: true };
  }
  return { inputSchema: current, changed: false };
};

const ensureTheme = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const palette = getPaletteById(spec.theme?.palette ?? "");
  const next = { ...palette.theme, ...spec.theme, palette: palette.id };
  const changed = JSON.stringify(next) !== JSON.stringify(spec.theme);
  if (changed) {
    warnings.push("Adjusted theme to a supported palette.");
    pushChange(changes, "theme", spec.theme, next, "Adjusted to supported palette.");
  }
  return { theme: next, changed };
};

const ensureConditions = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const defaults = DEFAULT_CONDITIONS[spec.templateId];
  const win = spec.winCondition?.type ? { ...defaults.win, ...spec.winCondition } : defaults.win;
  const lose = spec.loseCondition?.type ? { ...defaults.lose, ...spec.loseCondition } : defaults.lose;
  let changed = false;
  if (!spec.winCondition?.type || !spec.loseCondition?.type) {
    warnings.push("Filled missing win/lose conditions.");
    pushChange(changes, "winCondition", spec.winCondition, win, "Filled win condition defaults.");
    pushChange(changes, "loseCondition", spec.loseCondition, lose, "Filled lose condition defaults.");
    changed = true;
  }
  return { winCondition: win, loseCondition: lose, changed };
};

const alignTargets = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const targetParamKey = TARGET_PARAM_MAP[spec.templateId];
  const loseParamKey = LOSE_PARAM_MAP[spec.templateId];
  let changed = false;
  const next = { ...spec };

  if (targetParamKey) {
    const targetValue = spec.params[targetParamKey] as number | undefined;
    if (typeof targetValue === "number" && Number.isFinite(targetValue)) {
      if (next.winCondition?.target !== targetValue) {
        const before = next.winCondition;
        next.winCondition = { ...next.winCondition, target: targetValue };
        warnings.push("Aligned win target with tuned parameters.");
        pushChange(changes, "winCondition.target", before?.target, targetValue, "Aligned win target.");
        changed = true;
      }
    }
  }

  if (loseParamKey) {
    const loseValue = spec.params[loseParamKey] as number | undefined;
    if (typeof loseValue === "number" && Number.isFinite(loseValue)) {
      if (next.loseCondition?.maxMisses !== loseValue) {
        const before = next.loseCondition;
        next.loseCondition = { ...next.loseCondition, maxMisses: loseValue };
        warnings.push("Aligned lose limit with tuned parameters.");
        pushChange(changes, "loseCondition.maxMisses", before?.maxMisses, loseValue, "Aligned lose limit.");
        changed = true;
      }
    }
  }

  return { spec: next, changed };
};

const enforceQuotas = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  let changed = false;
  const next = { ...spec, params: { ...spec.params } };
  const duration = 30;

  const clampTarget = (key: string, maxTargets: number) => {
    const current = next.params[key];
    if (typeof current !== "number") return;
    if (current > maxTargets) {
      next.params[key] = maxTargets;
      changed = true;
      warnings.push("Reduced target quota to keep the game winnable.");
      pushChange(changes, `params.${key}`, current, maxTargets, "Reduced quota for playability.");
    }
  };

  if (spec.templateId === "CLICK_TARGETS") {
    const interval = next.params.spawnInterval || 0.7;
    const maxTargets = Math.max(12, Math.floor(duration / interval) + 6);
    clampTarget("targetCount", maxTargets);
  }

  if (spec.templateId === "WHACK_A_MOLE_CLICKER") {
    const interval = next.params.spawnInterval || 0.6;
    const maxTargets = Math.max(14, Math.floor(duration / interval) + 4);
    clampTarget("targetCount", maxTargets);
  }

  if (spec.templateId === "AIM_TRAINER_FLICK") {
    const interval = next.params.spawnInterval || 0.6;
    const maxTargets = Math.max(12, Math.floor(duration / interval) + 4);
    clampTarget("targetCount", maxTargets);
  }

  return { spec: next, changed };
};

const softenUnwinnableCombos = (spec: MinigameSpec, warnings: string[], changes: AutoFixChange[]) => {
  const next = { ...spec, params: { ...spec.params }, modifiers: [...spec.modifiers] };
  const warn = (message: string) => warnings.push(message);
  let changed = false;

  if (next.templateId === "CLICK_TARGETS") {
    const targetSize = next.params.targetSize;
    const hasSmall = next.modifiers.includes("smallTargets");
    const hasJitter = next.modifiers.includes("jitteryTargets");
    if (hasSmall && hasJitter && targetSize < 28) {
      const before = [...next.modifiers];
      next.modifiers = next.modifiers.filter((id) => id !== "jitteryTargets");
      warn("Removed jittery targets to keep clicks fair.");
      pushChange(changes, "modifiers", before, next.modifiers, "Removed jittery targets for fairness.");
      changed = true;
    }
  }

  if (next.templateId === "TIMING_BAR") {
    const hits = next.params.requiredHits;
    const zone = next.params.greenZoneSize;
    if (next.modifiers.includes("fastNeedle") && hits >= 8 && zone <= 0.14) {
      const before = next.params.greenZoneSize;
      next.params.greenZoneSize = 0.16;
      warn("Expanded the timing window for playability.");
      pushChange(
        changes,
        "params.greenZoneSize",
        before,
        next.params.greenZoneSize,
        "Expanded timing window."
      );
      changed = true;
    }
  }

  if (next.templateId === "DODGE_SURVIVE") {
    const spawnRate = next.params.spawnRate;
    if (next.modifiers.includes("extraHazardsButSlower") && spawnRate > 1.5) {
      const before = next.params.spawnRate;
      next.params.spawnRate = 1.5;
      warn("Reduced hazard spawn rate to keep it winnable.");
      pushChange(changes, "params.spawnRate", before, next.params.spawnRate, "Reduced hazard spawn rate.");
      changed = true;
    }
  }

  if (next.templateId === "BREAKOUT_MICRO") {
    const paddleWidth = next.params.paddleWidth;
    const ballSpeed = next.params.ballSpeed;
    if (paddleWidth < 140 && ballSpeed > 280) {
      const before = next.params.paddleWidth;
      next.params.paddleWidth = 140;
      warn("Widened paddle slightly for a fair bounce window.");
      pushChange(changes, "params.paddleWidth", before, next.params.paddleWidth, "Widened paddle.");
      changed = true;
    }
  }

  if (next.templateId === "WHACK_A_MOLE_CLICKER") {
    const targetSize = next.params.targetSize;
    const targetCount = next.params.targetCount;
    if (targetSize < 56 && targetCount > 24) {
      const beforeSize = next.params.targetSize;
      const beforeCount = next.params.targetCount;
      next.params.targetSize = 56;
      next.params.targetCount = 24;
      warn("Adjusted target size and quota to stay achievable.");
      pushChange(changes, "params.targetSize", beforeSize, next.params.targetSize, "Adjusted target size.");
      pushChange(changes, "params.targetCount", beforeCount, next.params.targetCount, "Adjusted target quota.");
      changed = true;
    }
  }

  if (next.templateId === "AIM_TRAINER_FLICK") {
    const targetSize = next.params.targetSize;
    const shrinkRate = next.params.shrinkRate;
    if (targetSize < 40 && shrinkRate > 1.2) {
      const before = next.params.shrinkRate;
      next.params.shrinkRate = 1.2;
      warn("Lowered shrink speed for a fair target window.");
      pushChange(changes, "params.shrinkRate", before, next.params.shrinkRate, "Lowered shrink speed.");
      changed = true;
    }
  }

  if (next.templateId === "LANE_DODGER") {
    const laneSpeed = next.params.laneSpeed;
    const spawnInterval = next.params.spawnInterval;
    if (laneSpeed > 280 && spawnInterval < 0.5) {
      const before = next.params.spawnInterval;
      next.params.spawnInterval = 0.5;
      warn("Relaxed spawn density for fair dodging.");
      pushChange(changes, "params.spawnInterval", before, next.params.spawnInterval, "Relaxed spawn density.");
      changed = true;
    }
  }

  return { spec: next, changed };
};

export function autoFixMinigameSpec(spec: MinigameSpec): AutoFixResult {
  const warnings: string[] = [];
  const changes: AutoFixChange[] = [];
  let changed = false;

  if (!TEMPLATE_PARAM_RANGES[spec.templateId]) {
    throw new Error(`Unknown templateId: ${spec.templateId}`);
  }

  const next: MinigameSpec = {
    ...spec,
    durationSeconds: 30,
    scoring: { mode: "winlose" },
    modifiers: Array.isArray(spec.modifiers) ? [...spec.modifiers] : [],
    params: { ...(spec.params ?? {}) }
  };

  if (spec.durationSeconds !== 30) {
    warnings.push("Duration locked to 30 seconds.");
    pushChange(changes, "durationSeconds", spec.durationSeconds, 30, "Locked duration to 30 seconds.");
    changed = true;
  }

  const paramsResult = ensureParams(next, warnings, changes);
  next.params = paramsResult.params;
  changed = changed || paramsResult.changed;

  const inputResult = ensureInputSchema(next, warnings, changes);
  next.inputSchema = inputResult.inputSchema;
  changed = changed || inputResult.changed;

  const themeResult = ensureTheme(next, warnings, changes);
  next.theme = themeResult.theme;
  changed = changed || themeResult.changed;

  const conditionResult = ensureConditions(next, warnings, changes);
  next.winCondition = conditionResult.winCondition;
  next.loseCondition = conditionResult.loseCondition;
  changed = changed || conditionResult.changed;

  const modifierResult = ensureModifiers(next, warnings, changes);
  next.modifiers = modifierResult.modifiers;
  changed = changed || modifierResult.changed;

  const softened = softenUnwinnableCombos(next, warnings, changes);
  const quotaResult = enforceQuotas(softened.spec, warnings, changes);
  const aligned = alignTargets(quotaResult.spec, warnings, changes);

  changed = changed || softened.changed || quotaResult.changed || aligned.changed;

  return { spec: aligned.spec, warnings, changes, changed };
}
