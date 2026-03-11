import type { CinematicCameraMode } from './cinematicSettings';

type CameraPhase = 'idle' | 'cast' | 'fight' | 'reveal';

export interface CameraFrameInput {
  dt: number;
  mode: CinematicCameraMode;
  reducedMotion: boolean;
  lowPerf: boolean;
  phase: CameraPhase;
  bobberX: number;
  bobberY: number;
  castAimOffset: number;
  castProgress: number;
  fishCueX: number;
  fishCueY: number;
}

export interface CameraFrameOutput {
  offsetX: number;
  offsetY: number;
  zoom: number;
  mode: CinematicCameraMode;
}

const BASE_CENTER_X = 640;
const BASE_CENTER_Y = 360;
const MAX_OFFSET_X = 94;
const MAX_OFFSET_Y = 66;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveCameraMode(mode: CinematicCameraMode, reducedMotion: boolean): CinematicCameraMode {
  return reducedMotion ? 'off' : mode;
}

export class OzarkCameraController {
  private x = 0;
  private y = 0;
  private zoom = 1;
  private driftT = 0;
  private impact = 0;
  private revealMs = 0;
  private revealDurationMs = 0;

  private readonly output: CameraFrameOutput = {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    mode: 'off'
  };

  onImpactBump(strength: number): void {
    this.impact = clamp(this.impact + strength, 0, 1);
  }

  startReveal(durationMs: number): void {
    this.revealDurationMs = clamp(durationMs, 180, 620);
    this.revealMs = this.revealDurationMs;
  }

  cancelReveal(): void {
    this.revealMs = 0;
    this.revealDurationMs = 0;
  }

  update(input: CameraFrameInput): CameraFrameOutput {
    const dt = Math.max(0, Math.min(0.05, input.dt));
    const mode = resolveCameraMode(input.mode, input.reducedMotion || input.lowPerf);

    if (mode === 'off') {
      this.revealMs = 0;
      this.revealDurationMs = 0;
      this.impact = 0;
      this.x = 0;
      this.y = 0;
      this.zoom = 1;
      this.output.offsetX = 0;
      this.output.offsetY = 0;
      this.output.zoom = 1;
      this.output.mode = mode;
      return this.output;
    }

    const modeStrength = mode === 'full' ? 1 : 0.56;
    const maxUnitsPerSec = (mode === 'full' ? 310 : 220) * modeStrength;
    const maxZoomPerSec = mode === 'full' ? 0.92 : 0.66;
    this.driftT += dt;

    const bobberDx = clamp(input.bobberX - BASE_CENTER_X, -MAX_OFFSET_X, MAX_OFFSET_X);
    const bobberDy = clamp(input.bobberY - BASE_CENTER_Y, -MAX_OFFSET_Y, MAX_OFFSET_Y);

    let targetX = bobberDx * 0.34;
    let targetY = bobberDy * 0.3;
    let targetZoom = 1;

    const driftAmp = input.lowPerf ? 0 : mode === 'full' ? 7 : 4;
    if (input.phase === 'idle') {
      targetX += Math.sin(this.driftT * 0.5) * driftAmp;
      targetY += Math.cos(this.driftT * 0.37) * driftAmp * 0.38;
      targetZoom = 1 + (mode === 'full' ? 0.02 : 0.01);
    } else if (input.phase === 'cast') {
      const castLead = (mode === 'full' ? 52 : 34) * clamp(1 - input.castProgress, 0, 1);
      targetX += input.castAimOffset * castLead;
      targetY += -6;
      targetZoom = 1 + (mode === 'full' ? 0.025 : 0.015);
    } else if (input.phase === 'fight') {
      const fishDx = clamp(input.fishCueX - BASE_CENTER_X, -110, 110);
      const fishDy = clamp(input.fishCueY - BASE_CENTER_Y, -84, 84);
      targetX = bobberDx * 0.22 + fishDx * 0.28;
      targetY = bobberDy * 0.18 + fishDy * 0.25;
      targetZoom = 1 + (mode === 'full' ? 0.06 : 0.035);
    }

    if (this.revealMs > 0 && this.revealDurationMs > 0) {
      this.revealMs = Math.max(0, this.revealMs - dt * 1000);
      const t = 1 - this.revealMs / this.revealDurationMs;
      const smooth = 1 - Math.pow(1 - t, 3);
      targetZoom += (mode === 'full' ? 0.12 : 0.075) * (1 - smooth);
      targetY -= (mode === 'full' ? 14 : 8) * (1 - smooth);
    }

    const impactKick = this.impact * (mode === 'full' ? 13 : 8);
    targetY += Math.sin(this.driftT * 31) * impactKick;
    this.impact = Math.max(0, this.impact - dt * 3.8);

    targetX = clamp(targetX, -MAX_OFFSET_X, MAX_OFFSET_X);
    targetY = clamp(targetY, -MAX_OFFSET_Y, MAX_OFFSET_Y);
    targetZoom = clamp(targetZoom, 1, mode === 'full' ? 1.2 : 1.12);

    const maxMove = maxUnitsPerSec * dt;
    const maxZoomStep = maxZoomPerSec * dt;

    this.x += clamp(targetX - this.x, -maxMove, maxMove);
    this.y += clamp(targetY - this.y, -maxMove, maxMove);
    this.zoom += clamp(targetZoom - this.zoom, -maxZoomStep, maxZoomStep);

    this.output.offsetX = this.x;
    this.output.offsetY = this.y;
    this.output.zoom = this.zoom;
    this.output.mode = mode;
    return this.output;
  }
}
