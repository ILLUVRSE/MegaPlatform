import type { MinigameSpec } from "../spec";
import { SeededRng } from "../rng";
import type { MinigameController, RuntimeContext } from "./types";
import { getPaletteById } from "../theme";
import { EffectsManager } from "./effects";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 608;

export type SnapshotRendererOptions = {
  canvas: HTMLCanvasElement;
  spec: MinigameSpec;
  controller: MinigameController;
};

export class MinigameSnapshotRenderer {
  private ctx: CanvasRenderingContext2D;
  private rng: SeededRng;
  private effects: EffectsManager;
  private timeRemaining: number;

  constructor(private options: SnapshotRendererOptions) {
    const ctx = options.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }
    this.ctx = ctx;
    this.options.canvas.width = DEFAULT_WIDTH;
    this.options.canvas.height = DEFAULT_HEIGHT;
    this.rng = new SeededRng(options.spec.seed);
    this.effects = new EffectsManager(this.rng);
    this.timeRemaining = options.spec.durationSeconds;

    options.controller.init(this.createContext());
  }

  setTimeRemaining(timeRemaining: number) {
    this.timeRemaining = timeRemaining;
  }

  render(state: unknown) {
    this.options.controller.hydrateState?.(state);
    this.renderBackground();
    this.options.controller.render(this.ctx);
  }

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

  private createContext(): RuntimeContext {
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      rng: this.rng,
      spec: this.options.spec,
      effects: this.effects,
      getTimeRemaining: () => this.timeRemaining,
      adjustTime: () => {
        // no-op in snapshot renderer
      },
      setResult: () => {
        // no-op in snapshot renderer
      },
      isGameOver: () => false,
      setStatus: () => {
        // no-op in snapshot renderer
      },
      playSfx: () => {
        // no-op in snapshot renderer
      }
    };
  }
}
