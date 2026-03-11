import { playTone } from '../../../systems/audioManager';
import { clamp } from '../config/tuning';

export type HomerunSfx =
  | 'swing'
  | 'contact'
  | 'perfect'
  | 'foul'
  | 'miss'
  | 'home_run'
  | 'crowd'
  | 'ui'
  | 'countdown'
  | 'timing_cue'
  | 'windup'
  | 'fireworks'
  | 'pa_home_run'
  | 'pa_perfect'
  | 'chant';

interface SfxOptions {
  gameId: string;
  enabled: boolean;
  limiter: Map<string, number>;
  crowd: number;
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

export function playHomerunSfx(cue: HomerunSfx, options: SfxOptions) {
  if (!options.enabled) return;
  if (!shouldPlay(options.limiter, cue, cue === 'ui' ? 60 : 35)) return;

  const crowdDrive = 1 + clamp(options.crowd, 0, 1) * 0.12;
  const variation = 0.94 + Math.random() * 0.12;

  switch (cue) {
    case 'ui':
      playTone({ frequency: 520 * variation, durationMs: 45, gain: 0.02, category: 'sfx', gameId: options.gameId });
      return;
    case 'countdown':
      playTone({ frequency: 610 * variation, durationMs: 80, gain: 0.035, category: 'sfx', gameId: options.gameId });
      return;
    case 'timing_cue':
      playTone({ frequency: 720 * variation, durationMs: 60, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'windup':
      playTone({ frequency: 220 * variation, durationMs: 120, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'swing':
      playTone({ frequency: 260 * variation, durationMs: 85, gain: 0.025, category: 'sfx', gameId: options.gameId });
      return;
    case 'miss':
      playTone({ frequency: 180 * variation, durationMs: 130, gain: 0.03, category: 'sfx', gameId: options.gameId });
      return;
    case 'contact':
      playTone({ frequency: 520 * variation, durationMs: 90, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 320 * variation, durationMs: 130, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 980 * variation, durationMs: 60, gain: 0.025 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'perfect':
      playTone({ frequency: 760 * variation, durationMs: 90, gain: 0.06 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 420 * variation, durationMs: 120, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 1180 * variation, durationMs: 70, gain: 0.03 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'foul':
      playTone({ frequency: 280 * variation, durationMs: 120, gain: 0.04, category: 'sfx', gameId: options.gameId });
      return;
    case 'home_run':
      playTone({ frequency: 900 * variation, durationMs: 160, gain: 0.06 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 520 * variation, durationMs: 210, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 220 * variation, durationMs: 240, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'crowd':
      playTone({ frequency: 160 * variation, durationMs: 260, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 240 * variation, durationMs: 220, gain: 0.03 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'fireworks':
      playTone({ frequency: 460 * variation, durationMs: 200, gain: 0.05 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'pa_home_run':
      playTone({ frequency: 260 * variation, durationMs: 240, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 340 * variation, durationMs: 220, gain: 0.045 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'pa_perfect':
      playTone({ frequency: 360 * variation, durationMs: 160, gain: 0.035 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 520 * variation, durationMs: 120, gain: 0.03 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
    case 'chant':
      playTone({ frequency: 180 * variation, durationMs: 260, gain: 0.045 * crowdDrive, category: 'sfx', gameId: options.gameId });
      playTone({ frequency: 220 * variation, durationMs: 240, gain: 0.04 * crowdDrive, category: 'sfx', gameId: options.gameId });
      return;
  }
}
