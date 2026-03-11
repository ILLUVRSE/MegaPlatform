import Phaser from 'phaser';
import { clampDprCap, type EffectsLevel, type PixelPuckSettings } from './settings';

export interface QualitySnapshot {
  effects: EffectsLevel;
  dprCap: number;
  appliedDpr: number;
}

const MIN_DPR = 1;
const MAX_DPR = 2.5;
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
  private effects: EffectsLevel;
  private dprCap: number;
  private appliedDpr: number;
  private lowFpsDuration = 0;
  private recoveryDuration = 0;
  private autoAdjust: boolean;
  private readonly game: Phaser.Game;
  private readonly onChange: (snapshot: QualitySnapshot) => void;

  constructor(game: Phaser.Game, settings: PixelPuckSettings, onChange: (snapshot: QualitySnapshot) => void) {
    this.game = game;
    this.effects = settings.effects;
    this.dprCap = clampDprCap(settings.dprCap);
    this.autoAdjust = settings.autoQuality;
    this.appliedDpr = applyDprCap(game, this.dprCap);
    this.onChange = onChange;
    this.emit();
  }

  updateFromSettings(settings: PixelPuckSettings) {
    this.effects = settings.effects;
    this.dprCap = clampDprCap(settings.dprCap);
    this.autoAdjust = settings.autoQuality;
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
    if (this.effects === 'high') {
      this.effects = 'low';
      this.emit();
      return;
    }
    if (this.effects === 'low') {
      this.effects = 'off';
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
    if (this.effects === 'off') {
      this.effects = 'low';
      this.emit();
    } else if (this.effects === 'low') {
      this.effects = 'high';
      this.emit();
    }
  }

  private emit() {
    this.onChange({ effects: this.effects, dprCap: this.dprCap, appliedDpr: this.appliedDpr });
  }
}
