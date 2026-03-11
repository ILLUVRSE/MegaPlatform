import type { MinigameSpec, MinigameTemplateId } from "./spec";
import { TEMPLATE_PARAM_RANGES, validateMinigameSpec } from "./spec";
import { SeededRng, deriveSeed, randomSeed } from "./rng";
import { TEMPLATES, TEMPLATE_MAP } from "./templates";
import { applyModifiers, filterCompatibleModifiers, MODIFIERS } from "./modifiers";
import { THEME_PALETTES } from "./theme";
import { getTemplateDifficultyCurve } from "./gamegrid";

const TEMPLATE_HISTORY_KEY = "illuvrse:minigame-template-history";
const TEMPLATE_HISTORY_LIMIT = 3;
let inMemoryHistory: MinigameTemplateId[] = [];

const ADJECTIVES = [
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

const NOUNS = [
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

const PANICS = ["Panic", "Rush", "Sprint", "Dash", "Rumble", "Frenzy", "Scramble", "Shuffle"];

const TAGLINES = [
  "30 seconds. No chill.",
  "Fast hands, faster chaos.",
  "Fair, frantic, and loud.",
  "One round. All vibes.",
  "Press start, embrace panic."
];

const buildTitle = (rng: SeededRng) =>
  `${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)} ${rng.pick(PANICS)}`;

const buildTagline = (rng: SeededRng) => rng.pick(TAGLINES);

const pickDifficulty = (templateId: MinigameTemplateId, rng: SeededRng) => {
  const curve = getTemplateDifficultyCurve(templateId);
  const min = curve.randomMin;
  const max = curve.randomMax;
  const roll = (rng.nextFloat(0, 1) + rng.nextFloat(0, 1)) / 2;
  return min + roll * (max - min);
};

const loadTemplateHistory = (): MinigameTemplateId[] => {
  if (typeof window === "undefined") return inMemoryHistory;
  try {
    const raw = window.localStorage.getItem(TEMPLATE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MinigameTemplateId[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveTemplateHistory = (history: MinigameTemplateId[]) => {
  const trimmed = history.slice(0, TEMPLATE_HISTORY_LIMIT);
  if (typeof window === "undefined") {
    inMemoryHistory = trimmed;
    return;
  }
  window.localStorage.setItem(TEMPLATE_HISTORY_KEY, JSON.stringify(trimmed));
};

const recordTemplateHistory = (templateId: MinigameTemplateId) => {
  const current = loadTemplateHistory();
  const next = [templateId, ...current.filter((id) => id !== templateId)].slice(
    0,
    TEMPLATE_HISTORY_LIMIT
  );
  saveTemplateHistory(next);
};

const pickTemplateWeighted = (rng: SeededRng, useHistory: boolean): MinigameTemplateId => {
  const recent = useHistory ? loadTemplateHistory() : [];
  const weighted = TEMPLATES.map((template) => ({
    id: template.id,
    weight: template.weight
  }));

  const filtered = useHistory
    ? weighted.filter((entry) => !recent.includes(entry.id))
    : weighted;
  const pool = filtered.length ? filtered : weighted;

  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.nextFloat(0, total);
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return pool[0].id;
};

const pickModifiers = (spec: MinigameSpec, rng: SeededRng) => {
  const compatible = filterCompatibleModifiers(spec);
  const gameplay = compatible.filter((modifier) => modifier.impact === "gameplay");
  const cosmetic = compatible.filter((modifier) => modifier.impact === "cosmetic");

  const gameplayCount = rng.nextInt(1, 2);
  const cosmeticCount = rng.chance(0.5) ? 1 : 0;

  const pickedGameplay = rng.shuffle(gameplay).slice(0, gameplayCount);
  const pickedCosmetic = rng.shuffle(cosmetic).slice(0, cosmeticCount);

  return [...pickedGameplay, ...pickedCosmetic].map((modifier) => modifier.id);
};

const enforceInterestingness = (spec: MinigameSpec, rng: SeededRng) => {
  const ranges = TEMPLATE_PARAM_RANGES[spec.templateId];
  const keys = Object.keys(spec.params);
  if (!ranges || keys.length === 0) return spec;

  const key = rng.pick(keys);
  const range = ranges[key];
  if (!range) return spec;

  const direction = rng.chance(0.5) ? 1.2 : 0.8;
  const nextValue = Math.max(range.min, Math.min(range.max, spec.params[key] * direction));
  return {
    ...spec,
    params: {
      ...spec.params,
      [key]: nextValue
    }
  };
};

const buildSpecFromTemplate = (
  seed: string,
  templateId: MinigameTemplateId,
  rng: SeededRng
): MinigameSpec => {
  const template = TEMPLATE_MAP[templateId];
  const theme = rng.pick(THEME_PALETTES).theme;
  const difficulty = pickDifficulty(templateId, rng);
  let base = template.buildSpec(seed, difficulty, theme);

  const attemptBuild = () => {
    const modifiers = pickModifiers(base, rng);
    let candidate = applyModifiers(base, rng, modifiers);
    candidate = enforceInterestingness(candidate, rng);
    return {
      ...candidate,
      title: buildTitle(rng),
      tagline: buildTagline(rng),
      instructions: candidate.instructions,
      modifiers
    };
  };

  let candidate = attemptBuild();
  let validation = validateMinigameSpec(candidate);
  let attempts = 0;
  while (!validation.ok && attempts < 5) {
    attempts += 1;
    candidate = attemptBuild();
    validation = validateMinigameSpec(candidate);
  }

  if (!validation.ok) {
    const fallback = { ...base, modifiers: [] };
    const fallbackValidation = validateMinigameSpec(fallback);
    if (!fallbackValidation.ok) {
      throw new Error(`Invalid minigame spec: ${fallbackValidation.errors.join(", ")}`);
    }
    return fallback;
  }

  return candidate;
};

export const generateRandomMinigame = ({ seed }: { seed?: string } = {}): MinigameSpec => {
  const actualSeed = seed ?? randomSeed();
  const rng = new SeededRng(actualSeed);
  const templateId = seed
    ? rng.pick(TEMPLATES).id
    : pickTemplateWeighted(rng, true);
  const spec = buildSpecFromTemplate(actualSeed, templateId, rng);
  if (!seed) {
    recordTemplateHistory(templateId);
  }
  return spec;
};

export const mutateMinigame = (spec: MinigameSpec): MinigameSpec => {
  const nextSeed = deriveSeed(spec.seed, "mutate");
  const rng = new SeededRng(nextSeed);
  const nextSpec = buildSpecFromTemplate(nextSeed, spec.templateId, rng);
  recordTemplateHistory(spec.templateId);
  return nextSpec;
};

export const rerollMinigame = (spec?: MinigameSpec): MinigameSpec => {
  const nextSeed = spec ? deriveSeed(spec.seed, "reroll") : randomSeed();
  const rng = new SeededRng(nextSeed);
  const templateId = spec ? pickTemplateWeighted(rng, true) : pickTemplateWeighted(rng, true);
  const nextSpec = buildSpecFromTemplate(nextSeed, templateId, rng);
  recordTemplateHistory(templateId);
  return nextSpec;
};

export const listModifierIds = () => MODIFIERS.map((modifier) => modifier.id);
