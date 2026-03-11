import type { MinigameSpec } from "../spec";
import type { SeededRng } from "../rng";
import type { EffectsManager } from "./effects";
import type { SfxId } from "./sfx";

export type InputSnapshot = {
  keysDown: Record<string, boolean>;
  keysPressed: Record<string, boolean>;
  mouse: {
    x: number;
    y: number;
    down: boolean;
    clicked: boolean;
  };
};

export type HudState = {
  timeRemaining: number;
  objective: string;
  status: string;
  result: "win" | "lose" | null;
};

export type RuntimeContext = {
  width: number;
  height: number;
  rng: SeededRng;
  spec: MinigameSpec;
  effects: EffectsManager;
  getTimeRemaining: () => number;
  adjustTime: (deltaSeconds: number) => void;
  setResult: (result: "win" | "lose") => void;
  isGameOver: () => boolean;
  setStatus: (status: string) => void;
  playSfx: (id: SfxId) => void;
};

export type MinigameController = {
  init: (ctx: RuntimeContext) => void;
  applyInput: (input: InputSnapshot) => void;
  step: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
  getObjectiveText: () => string;
  getStatusText: () => string;
  serializeState: () => unknown;
  hydrateState?: (state: unknown) => void;
  getScore?: () => number;
  getWin?: () => boolean;
};
