import type { MinigameSpec, MinigameTemplateId, MinigameTheme } from "../spec";
import type { MinigameController } from "../runtime/types";
import { buildSpec as buildButtonMash, createController as createButtonMash } from "./buttonMashRace";
import { buildSpec as buildDodge, createController as createDodge } from "./dodgeSurvive";
import { buildSpec as buildClick, createController as createClick } from "./clickTargets";
import { buildSpec as buildTiming, createController as createTiming } from "./timingBar";
import { buildSpec as buildCollect, createController as createCollect } from "./collectAndEscape";
import { buildSpec as buildArena, createController as createArena } from "./microArenaKo";
import { buildSpec as buildBreakout, createController as createBreakout } from "./breakout-micro";
import { buildSpec as buildWhack, createController as createWhack } from "./whack-a-mole";
import { buildSpec as buildLane, createController as createLane } from "./lane-dodger";
import { buildSpec as buildAim, createController as createAim } from "./aim-trainer";

export type TemplateDefinition = {
  id: MinigameTemplateId;
  buildSpec: (seed: string, difficulty: number, theme: MinigameTheme) => MinigameSpec;
  createController: (spec: MinigameSpec) => MinigameController;
  weight: number;
};

export const TEMPLATES: TemplateDefinition[] = [
  { id: "BUTTON_MASH_RACE", buildSpec: buildButtonMash, createController: createButtonMash, weight: 0.9 },
  { id: "DODGE_SURVIVE", buildSpec: buildDodge, createController: createDodge, weight: 1 },
  { id: "CLICK_TARGETS", buildSpec: buildClick, createController: createClick, weight: 0.9 },
  { id: "TIMING_BAR", buildSpec: buildTiming, createController: createTiming, weight: 0.8 },
  { id: "COLLECT_AND_ESCAPE", buildSpec: buildCollect, createController: createCollect, weight: 1 },
  { id: "MICRO_ARENA_KO", buildSpec: buildArena, createController: createArena, weight: 1 },
  { id: "BREAKOUT_MICRO", buildSpec: buildBreakout, createController: createBreakout, weight: 1.2 },
  { id: "WHACK_A_MOLE_CLICKER", buildSpec: buildWhack, createController: createWhack, weight: 1.1 },
  { id: "LANE_DODGER", buildSpec: buildLane, createController: createLane, weight: 1.1 },
  { id: "AIM_TRAINER_FLICK", buildSpec: buildAim, createController: createAim, weight: 1.1 }
];

export const TEMPLATE_MAP: Record<MinigameTemplateId, TemplateDefinition> = TEMPLATES.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<MinigameTemplateId, TemplateDefinition>
);

export const getTemplateById = (id: MinigameTemplateId) => TEMPLATE_MAP[id];

export const createControllerForSpec = (spec: MinigameSpec) =>
  TEMPLATE_MAP[spec.templateId].createController(spec);
