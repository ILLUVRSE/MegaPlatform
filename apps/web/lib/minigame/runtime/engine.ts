import type { MinigameSpec } from "../spec";
import { SeededRng } from "../rng";
import type { HudState, InputSnapshot, MinigameController, RuntimeContext } from "./types";
import { InputManager } from "./input";
import { getPaletteById } from "../theme";
import { EffectsManager } from "./effects";
import { sfx } from "./sfx";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 608;
const FIXED_DT = 1 / 60;

export type RuntimeOptions = {
  canvas: HTMLCanvasElement;
  spec: MinigameSpec;
  controller: MinigameController;
  onHudUpdate?: (hud: HudState) => void;
  onGameOver?: (result: "win" | "lose") => void;
};

export class MinigameRuntime {
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private rng: SeededRng;
  private effects: EffectsManager;
  private timeRemaining: number;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private result: "win" | "lose" | null = null;
  private status = "";
  private frameId: number | null = null;

  constructor(private options: RuntimeOptions) {
    const ctx = options.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }
    this.ctx = ctx;
    this.options.canvas.width = DEFAULT_WIDTH;
    this.options.canvas.height = DEFAULT_HEIGHT;
    this.input = new InputManager(options.canvas);
    this.rng = new SeededRng(options.spec.seed);
    this.effects = new EffectsManager(this.rng);

    const duration =
      process.env.NEXT_PUBLIC_E2E_FAST_TIMER === "1" ? 3 : options.spec.durationSeconds;
    this.timeRemaining = duration;

    options.controller.init(this.createContext());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.input.destroy();
  }

  setInputEnabled(enabled: boolean) {
    this.input.setEnabled(enabled);
  }

  reset() {
    this.stop();
    this.result = null;
    this.status = "";
    this.accumulator = 0;
    this.lastTime = 0;
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

  applyInput(snapshot: InputSnapshot) {
    this.options.controller.applyInput(snapshot);
  }

  step(dt: number) {
    if (this.result) return;

    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    this.options.controller.step(dt);
    this.effects.step(dt);

    if (!this.result && this.timeRemaining <= 0) {
      this.setResult("lose");
    }
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;
    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.accumulator += delta;

    const inputSnapshot = this.input.snapshot();

    while (this.accumulator >= FIXED_DT) {
      this.applyInput(inputSnapshot);
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.render();

    const hud = this.getHudState();
    this.options.onHudUpdate?.(hud);
    if (hud.result && this.running) {
      this.options.onGameOver?.(hud.result);
      this.running = false;
    }

    this.frameId = requestAnimationFrame(this.loop);
  };

  private renderBackground() {
    const palette = getPaletteById(this.options.spec.theme.palette);
    this.ctx.fillStyle = palette.colors.background;
    this.ctx.fillRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);

    this.ctx.fillStyle = palette.colors.backgroundSecondary;
    if (this.options.spec.theme.bgStyle === "checker") {
      const size = 40;
      for (let x = 0; x < DEFAULT_WIDTH; x += size) {
        for (let y = 0; y < DEFAULT_HEIGHT; y += size) {
          if ((x / size + y / size) % 2 === 0) {
            this.ctx.fillRect(x, y, size, size);
          }
        }
      }
    } else {
      this.ctx.globalAlpha = 0.15;
      this.ctx.beginPath();
      this.ctx.arc(DEFAULT_WIDTH * 0.2, DEFAULT_HEIGHT * 0.2, 180, 0, Math.PI * 2);
      this.ctx.arc(DEFAULT_WIDTH * 0.8, DEFAULT_HEIGHT * 0.7, 240, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  private render() {
    this.renderBackground();
    const shake = this.effects.getShakeOffset();
    const zoom = this.options.spec.modifiers.includes("zoomCameraSlight") ? 1.04 : 1;
    if (zoom !== 1 || shake.x !== 0 || shake.y !== 0) {
      this.ctx.save();
      this.ctx.translate(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2);
      this.ctx.scale(zoom, zoom);
      this.ctx.translate(-DEFAULT_WIDTH / 2, -DEFAULT_HEIGHT / 2);
      this.ctx.translate(shake.x, shake.y);
    }
    this.options.controller.render(this.ctx);
    if (zoom !== 1 || shake.x !== 0 || shake.y !== 0) {
      this.ctx.restore();
    }

    this.effects.render(this.ctx);

    if (this.options.spec.modifiers.includes("pulsatingLights")) {
      const pulse = (Math.sin(performance.now() / 350) + 1) * 0.5;
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255,255,255,${0.08 * pulse})`;
      this.ctx.fillRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
      this.ctx.restore();
    }
  }

  private setResult(result: "win" | "lose") {
    if (this.result) return;
    this.result = result;
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
      playSfx: (id) => {
        sfx.play(id);
      }
    };
  }
}
