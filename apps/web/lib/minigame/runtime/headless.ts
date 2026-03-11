import type { MinigameSpec } from "../spec";
import { SeededRng } from "../rng";
import type { HudState, InputSnapshot, MinigameController, RuntimeContext } from "./types";
import { EffectsManager } from "./effects";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 608;

export type HeadlessRuntimeOptions = {
  spec: MinigameSpec;
  controller: MinigameController;
  onGameOver?: (result: "win" | "lose") => void;
};

export class MinigameHeadlessRuntime {
  private rng: SeededRng;
  private effects: EffectsManager;
  private timeRemaining: number;
  private durationSeconds: number;
  private result: "win" | "lose" | null = null;
  private status = "";
  private completionTimeSeconds: number | null = null;

  constructor(private options: HeadlessRuntimeOptions) {
    this.rng = new SeededRng(options.spec.seed);
    this.effects = new EffectsManager(this.rng);

    const duration =
      process.env.NEXT_PUBLIC_E2E_FAST_TIMER === "1" ? 3 : options.spec.durationSeconds;
    this.durationSeconds = duration;
    this.timeRemaining = duration;

    options.controller.init(this.createContext());
  }

  getHudState(): HudState {
    return {
      timeRemaining: Math.max(0, this.timeRemaining),
      objective: this.options.controller.getObjectiveText(),
      status: this.options.controller.getStatusText() || this.status,
      result: this.result
    };
  }

  serializeState() {
    return this.options.controller.serializeState();
  }

  getScore() {
    return this.options.controller.getScore?.() ?? 0;
  }

  getCompletionTimeSeconds() {
    return this.completionTimeSeconds;
  }

  applyInput(snapshot: InputSnapshot) {
    this.options.controller.applyInput(snapshot);
  }

  step(dt: number) {
    if (this.result) return;

    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    this.options.controller.step(dt);
    this.effects.step(dt);
    // Advance shake RNG to keep behavior aligned with render mode.
    this.effects.getShakeOffset();

    if (!this.result && this.timeRemaining <= 0) {
      this.setResult("lose");
    }

    const hud = this.getHudState();
    if (hud.result && this.result) {
      this.options.onGameOver?.(this.result);
    }
  }

  private setResult(result: "win" | "lose") {
    if (this.result) return;
    this.result = result;
    this.completionTimeSeconds = Math.max(0, this.durationSeconds - this.timeRemaining);
  }

  private createContext(): RuntimeContext {
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      rng: this.rng,
      spec: this.options.spec,
      effects: this.effects,
      getTimeRemaining: () => this.timeRemaining,
      adjustTime: (deltaSeconds) => {
        this.timeRemaining = Math.max(0, this.timeRemaining + deltaSeconds);
      },
      setResult: (result) => this.setResult(result),
      isGameOver: () => Boolean(this.result),
      setStatus: (status) => {
        this.status = status;
      },
      playSfx: () => {
        // no-op in headless mode
      }
    };
  }
}
