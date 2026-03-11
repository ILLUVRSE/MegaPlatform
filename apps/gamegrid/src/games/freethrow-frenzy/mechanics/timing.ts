import { clamp, type TimingBucket, type TimingTuning } from '../config/tuning';

export interface TimingResult {
  bucket: TimingBucket;
  quality: number;
  offset: number;
}

export function normalizePhase(phase: number): number {
  const wrapped = phase - Math.floor(phase);
  return clamp(wrapped, 0, 1);
}

export function meterPosition(phase: number): number {
  return normalizePhase(phase);
}

export function computeTimingWindow(tuning: TimingTuning, difficultyScale: number, pressure: number): {
  green: number;
  yellow: number;
} {
  const shrink = pressure * tuning.pressureShrink;
  const green = clamp(tuning.greenWindow * difficultyScale - shrink, 0.04, 0.18);
  const yellow = clamp(tuning.yellowWindow * difficultyScale - shrink * 0.6, green + 0.04, 0.32);
  return { green, yellow };
}

export function classifyTiming(phase: number, window: { green: number; yellow: number }): TimingResult {
  const pos = meterPosition(phase);
  const center = 0.5;
  const offset = pos - center;
  const abs = Math.abs(offset);
  const greenRadius = window.green * 0.5;
  const yellowRadius = window.yellow * 0.5;

  if (abs <= greenRadius) {
    return { bucket: 'perfect', quality: 1, offset };
  }
  if (abs <= yellowRadius) {
    const normalized = clamp(1 - (abs - greenRadius) / (yellowRadius - greenRadius + 0.0001), 0.6, 0.95);
    return { bucket: 'good', quality: normalized, offset };
  }
  return {
    bucket: offset < 0 ? 'early' : 'late',
    quality: clamp(0.45 - abs, 0, 0.45),
    offset
  };
}
