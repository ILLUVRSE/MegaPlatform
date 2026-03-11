import { playTone } from '../../systems/audioManager';

type ThrowDartsCue = 'throw' | 'board_hit' | 'wire' | 'bull' | 'bust' | 'ui' | 'win';

interface CueConfig {
  frequency: number;
  durationMs: number;
  gain: number;
}

const BASE_CUES: Record<ThrowDartsCue, CueConfig[]> = {
  throw: [
    { frequency: 420, durationMs: 90, gain: 0.08 },
    { frequency: 520, durationMs: 70, gain: 0.06 }
  ],
  board_hit: [
    { frequency: 180, durationMs: 120, gain: 0.12 },
    { frequency: 220, durationMs: 90, gain: 0.1 }
  ],
  wire: [
    { frequency: 980, durationMs: 35, gain: 0.06 },
    { frequency: 860, durationMs: 45, gain: 0.05 }
  ],
  bull: [
    { frequency: 620, durationMs: 120, gain: 0.12 },
    { frequency: 760, durationMs: 90, gain: 0.1 }
  ],
  bust: [
    { frequency: 140, durationMs: 160, gain: 0.14 },
    { frequency: 120, durationMs: 180, gain: 0.16 }
  ],
  ui: [
    { frequency: 520, durationMs: 45, gain: 0.05 },
    { frequency: 480, durationMs: 40, gain: 0.045 }
  ],
  win: [
    { frequency: 640, durationMs: 160, gain: 0.12 },
    { frequency: 820, durationMs: 120, gain: 0.1 }
  ]
};

export class ThrowDartsAudio {
  private lastCueMs = 0;
  private limiter = 1;
  private enabled = true;
  private readonly gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  play(cue: ThrowDartsCue) {
    if (!this.enabled) return;
    const now = performance.now();
    const dt = now - this.lastCueMs;
    this.lastCueMs = now;
    this.limiter = Math.min(1, dt < 90 ? this.limiter * 0.75 : this.limiter + 0.15);

    const pack = BASE_CUES[cue];
    const pick = pack[Math.floor(Math.random() * pack.length)];
    const variance = (Math.random() - 0.5) * 0.12;
    const freq = pick.frequency * (1 + variance);
    const gain = pick.gain * this.limiter;

    playTone({
      frequency: freq,
      durationMs: pick.durationMs,
      gain,
      category: 'sfx',
      gameId: this.gameId
    });

    if (cue === 'bull' || cue === 'win') {
      playTone({
        frequency: freq * 1.25,
        durationMs: Math.max(40, pick.durationMs * 0.6),
        gain: gain * 0.6,
        category: 'sfx',
        gameId: this.gameId
      });
    }
  }
}
