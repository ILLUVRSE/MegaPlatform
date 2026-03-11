export type SlowMoReason = 'perfect_hook' | 'legendary_strike' | 'dramatic_run';

export interface SlowMoState {
  timeScale: number;
  active: boolean;
  label: string;
  labelAlpha: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class VisualSlowMoController {
  private enabled = true;
  private remainingMs = 0;
  private durationMs = 0;
  private timeScale = 1;
  private label = '';

  private readonly output: SlowMoState = {
    timeScale: 1,
    active: false,
    label: '',
    labelAlpha: 0
  };

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  trigger(reason: SlowMoReason, durationMs: number, customLabel?: string): boolean {
    if (!this.enabled) return false;
    const clamped = clamp(durationMs, 250, 450);
    this.durationMs = clamped;
    this.remainingMs = clamped;
    this.timeScale = reason === 'legendary_strike' ? 0.35 : reason === 'dramatic_run' ? 0.42 : 0.48;
    this.label = customLabel ?? (reason === 'perfect_hook' ? 'PERFECT HOOK' : reason === 'legendary_strike' ? 'LEGENDARY STRIKE' : 'DRAMATIC RUN');
    return true;
  }

  reset(): void {
    this.remainingMs = 0;
    this.durationMs = 0;
    this.timeScale = 1;
    this.label = '';
    this.output.timeScale = 1;
    this.output.active = false;
    this.output.label = '';
    this.output.labelAlpha = 0;
  }

  update(deltaMs: number, forceOff = false): SlowMoState {
    if (forceOff || !this.enabled) {
      this.reset();
      return this.output;
    }

    const dtMs = Math.max(0, Math.min(60, deltaMs));
    if (this.remainingMs > 0) {
      this.remainingMs = Math.max(0, this.remainingMs - dtMs);
    }

    const active = this.remainingMs > 0;
    if (!active || this.durationMs <= 0) {
      this.output.timeScale = 1;
      this.output.active = false;
      this.output.label = '';
      this.output.labelAlpha = 0;
      return this.output;
    }

    const t = 1 - this.remainingMs / this.durationMs;
    const fade = t < 0.24 ? t / 0.24 : t > 0.8 ? (1 - t) / 0.2 : 1;
    this.output.timeScale = this.timeScale;
    this.output.active = true;
    this.output.label = this.label;
    this.output.labelAlpha = clamp(fade, 0, 1);
    return this.output;
  }
}

export function computeVisualDelta(simulationDt: number, visualTimeScale: number): number {
  return Math.max(0, simulationDt) * clamp(visualTimeScale, 0.3, 1);
}
