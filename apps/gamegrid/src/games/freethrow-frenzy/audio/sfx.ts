import { playTone } from '../../../systems/audioManager';
import { clamp } from '../config/tuning';

export type FreethrowSfx =
  | 'swish'
  | 'rim'
  | 'backboard'
  | 'net'
  | 'bounce'
  | 'ui'
  | 'countdown'
  | 'buzzer'
  | 'spawn'
  | 'miss';

interface SfxOptions {
  gameId: string;
  enabled: boolean;
  heatLevel: number;
  limiter: Map<string, number>;
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function shouldPlay(limiter: Map<string, number>, key: string, minGapMs: number) {
  const now = nowMs();
  const last = limiter.get(key) ?? 0;
  if (now - last < minGapMs) return false;
  limiter.set(key, now);
  return true;
}

export function playFreethrowSfx(cue: FreethrowSfx, options: SfxOptions) {
  if (!options.enabled) return;
  if (!shouldPlay(options.limiter, cue, cue === 'ui' ? 60 : 35)) return;

  const crowdDrive = 1 + options.heatLevel * 0.06;
  const variation = 0.94 + Math.random() * 0.12;

  switch (cue) {
    case 'ui':
      playTone({ frequency: 520 * variation, durationMs: 45, gain: 0.02, category: 'sfx', gameId: options.gameId });
      return;
    case 'spawn':
      playTone({ frequency: 240 * variation, durationMs: 55, gain: 0.018, category: 'sfx', gameId: options.gameId });
      return;
    case 'swish':
      playTone({ frequency: 700 * variation, durationMs: 120, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'net':
      playTone({ frequency: 560 * variation, durationMs: 90, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'rim':
      playTone({ frequency: 460 * variation, durationMs: 110, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'backboard':
      playTone({ frequency: 320 * variation, durationMs: 90, gain: 0.035 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'bounce':
      playTone({ frequency: 200 * variation, durationMs: 70, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'miss':
      playTone({ frequency: 180 * variation, durationMs: 120, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'countdown':
      playTone({ frequency: 640 * variation, durationMs: 80, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'buzzer':
      playTone({ frequency: 160 * variation, durationMs: 240, gain: 0.05, category: 'sfx', gameId: options.gameId });
      return;
  }
}

export function scaleTone(base: number, heatLevel: number): number {
  return clamp(base * (1 + heatLevel * 0.02), base * 0.9, base * 1.2);
}
