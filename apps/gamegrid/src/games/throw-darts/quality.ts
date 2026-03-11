import Phaser from 'phaser';
import type { ThrowDartsVfxLevel } from './types';

export interface QualitySnapshot {
  vfxLevel: ThrowDartsVfxLevel;
  dprCap: number;
  appliedDpr: number;
}

const MIN_DPR = 1;
const MAX_DPR = 2.25;
const LOW_FPS_THRESHOLD = 52;
const RECOVERY_FPS = 58;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function applyDprCap(game: Phaser.Game, dprCap: number) {
  const renderer = game.renderer as Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer;
  const device = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const applied = clamp(Math.min(device, dprCap), MIN_DPR, MAX_DPR);
  if ('resolution' in renderer) {
    renderer.resolution = applied;
  }
  renderer.resize(game.scale.width, game.scale.height);
  return applied;
}

export class QualityTuner {
  private vfxLevel: ThrowDartsVfxLevel;
  private dprCap: number;
  private appliedDpr: number;
  private lowFpsDuration = 0;
  private recoveryDuration = 0;
  private autoAdjust: boolean;
  private readonly game: Phaser.Game;
  private readonly onChange: (snapshot: QualitySnapshot) => void;

  constructor(
    game: Phaser.Game,
    options: { vfxLevel: ThrowDartsVfxLevel; dprCap: number; autoQuality: boolean },
    onChange: (snapshot: QualitySnapshot) => void
  ) {
    this.game = game;
    this.vfxLevel = options.vfxLevel;
    this.dprCap = clamp(options.dprCap, MIN_DPR, MAX_DPR);
    this.autoAdjust = options.autoQuality;
    this.appliedDpr = applyDprCap(game, this.dprCap);
    this.onChange = onChange;
    this.emit();
  }

  updateFromOptions(options: { vfxLevel: ThrowDartsVfxLevel; dprCap: number; autoQuality: boolean }) {
    this.vfxLevel = options.vfxLevel;
    this.dprCap = clamp(options.dprCap, MIN_DPR, MAX_DPR);
    this.autoAdjust = options.autoQuality;
    this.appliedDpr = applyDprCap(this.game, this.dprCap);
    this.emit();
  }

  sampleFps(fps: number, dt: number) {
    if (!this.autoAdjust) return;
    if (fps < LOW_FPS_THRESHOLD) {
      this.lowFpsDuration += dt;
      this.recoveryDuration = 0;
      if (this.lowFpsDuration > 2.2) {
        this.lowFpsDuration = 0;
        this.degradeQuality();
      }
      return;
    }

    if (fps > RECOVERY_FPS) {
      this.recoveryDuration += dt;
      if (this.recoveryDuration > 5) {
        this.recoveryDuration = 0;
        this.improveQuality();
      }
    }
  }

  private degradeQuality() {
    if (this.vfxLevel === 'high') {
      this.vfxLevel = 'low';
      this.emit();
      return;
    }
    if (this.vfxLevel === 'low') {
      this.vfxLevel = 'off';
      this.emit();
      return;
    }
    if (this.dprCap > MIN_DPR + 0.05) {
      this.dprCap = clamp(this.dprCap - 0.25, MIN_DPR, MAX_DPR);
      this.appliedDpr = applyDprCap(this.game, this.dprCap);
      this.emit();
    }
  }

  private improveQuality() {
    if (this.dprCap < 1.75) {
      this.dprCap = clamp(this.dprCap + 0.25, MIN_DPR, MAX_DPR);
      this.appliedDpr = applyDprCap(this.game, this.dprCap);
      this.emit();
      return;
    }
    if (this.vfxLevel === 'off') {
      this.vfxLevel = 'low';
      this.emit();
    } else if (this.vfxLevel === 'low') {
      this.vfxLevel = 'high';
      this.emit();
    }
  }

  private emit() {
    this.onChange({ vfxLevel: this.vfxLevel, dprCap: this.dprCap, appliedDpr: this.appliedDpr });
  }
}
