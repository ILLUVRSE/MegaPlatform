import Phaser from 'phaser';
import { playTone } from '../../systems/audioManager';

type OzChronicleCue =
  | 'ui'
  | 'page'
  | 'choice'
  | 'map'
  | 'minigame'
  | 'success'
  | 'fail'
  | 'perfect'
  | 'companion'
  | 'warning'
  | 'credits';

type AmbientMode = 'map' | 'story' | 'minigame' | 'credits';

interface CueTone {
  frequency: number;
  durationMs: number;
  gain: number;
}

interface AmbientConfig {
  delayMs: number;
  chords: number[][];
  gain: number;
}

const CUES: Record<OzChronicleCue, CueTone[]> = {
  ui: [
    { frequency: 520, durationMs: 45, gain: 0.045 },
    { frequency: 460, durationMs: 55, gain: 0.04 },
    { frequency: 600, durationMs: 40, gain: 0.035 }
  ],
  page: [
    { frequency: 320, durationMs: 160, gain: 0.05 },
    { frequency: 360, durationMs: 140, gain: 0.045 }
  ],
  choice: [
    { frequency: 540, durationMs: 90, gain: 0.05 },
    { frequency: 620, durationMs: 70, gain: 0.045 }
  ],
  map: [
    { frequency: 400, durationMs: 120, gain: 0.05 },
    { frequency: 440, durationMs: 110, gain: 0.045 }
  ],
  minigame: [
    { frequency: 720, durationMs: 120, gain: 0.06 },
    { frequency: 640, durationMs: 110, gain: 0.055 }
  ],
  success: [
    { frequency: 720, durationMs: 180, gain: 0.07 },
    { frequency: 640, durationMs: 160, gain: 0.065 }
  ],
  fail: [
    { frequency: 180, durationMs: 220, gain: 0.08 },
    { frequency: 140, durationMs: 240, gain: 0.085 }
  ],
  perfect: [
    { frequency: 820, durationMs: 200, gain: 0.075 },
    { frequency: 980, durationMs: 160, gain: 0.07 }
  ],
  companion: [
    { frequency: 560, durationMs: 140, gain: 0.055 },
    { frequency: 700, durationMs: 110, gain: 0.05 }
  ],
  warning: [
    { frequency: 260, durationMs: 120, gain: 0.05 },
    { frequency: 240, durationMs: 140, gain: 0.055 }
  ],
  credits: [
    { frequency: 480, durationMs: 220, gain: 0.055 },
    { frequency: 540, durationMs: 200, gain: 0.05 }
  ]
};

const AMBIENT_MODES: Record<AmbientMode, AmbientConfig> = {
  map: {
    delayMs: 5200,
    gain: 0.02,
    chords: [
      [196, 247, 392],
      [220, 277, 440],
      [174, 220, 349]
    ]
  },
  story: {
    delayMs: 6200,
    gain: 0.018,
    chords: [
      [196, 247, 330],
      [185, 233, 311],
      [174, 220, 294]
    ]
  },
  minigame: {
    delayMs: 3600,
    gain: 0.022,
    chords: [
      [220, 330, 440],
      [247, 370, 494]
    ]
  },
  credits: {
    delayMs: 7200,
    gain: 0.02,
    chords: [
      [196, 247, 392, 523],
      [174, 220, 349, 466]
    ]
  }
};

export class OzChronicleAudio {
  private lastCueMs = 0;
  private limiter = 1;
  private ambientTimer: Phaser.Time.TimerEvent | null = null;
  private ambientMode: AmbientMode = 'map';
  private scene: Phaser.Scene | null = null;
  private ambientIndex = 0;
  private lastAmbientMs = 0;
  private ambientDelayMs = AMBIENT_MODES.map.delayMs;
  private readonly gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  play(cue: OzChronicleCue): void {
    const now = performance.now();
    const dt = now - this.lastCueMs;
    this.lastCueMs = now;
    this.limiter = Math.min(1, dt < 80 ? this.limiter * 0.7 : this.limiter + 0.12);

    const pack = CUES[cue];
    const pick = pack[Math.floor(Math.random() * pack.length)];
    const variance = (Math.random() - 0.5) * 0.1;
    const freq = pick.frequency * (1 + variance);
    const gain = pick.gain * this.limiter;

    playTone({
      frequency: freq,
      durationMs: pick.durationMs,
      gain,
      category: 'sfx',
      gameId: this.gameId
    });

    if (cue === 'success' || cue === 'perfect' || cue === 'credits') {
      playTone({
        frequency: freq * 1.25,
        durationMs: Math.max(60, pick.durationMs * 0.6),
        gain: gain * 0.55,
        category: 'sfx',
        gameId: this.gameId
      });
    }
  }

  startAmbient(scene: Phaser.Scene, mode: AmbientMode): void {
    this.scene = scene;
    this.setAmbientMode(mode);
    this.scheduleAmbient();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopAmbient();
    });
  }

  setAmbientMode(mode: AmbientMode): void {
    this.ambientMode = mode;
    this.ambientDelayMs = AMBIENT_MODES[mode].delayMs;
    if (this.scene) this.scheduleAmbient();
  }

  stopAmbient(): void {
    if (this.ambientTimer && this.scene) {
      this.scene.time.removeEvent(this.ambientTimer);
    }
    this.ambientTimer = null;
  }

  private scheduleAmbient(): void {
    if (!this.scene) return;
    if (this.ambientTimer) this.scene.time.removeEvent(this.ambientTimer);
    this.ambientTimer = this.scene.time.addEvent({
      delay: this.ambientDelayMs,
      loop: true,
      callback: () => this.playAmbient()
    });
    this.playAmbient();
  }

  private playAmbient(): void {
    const now = performance.now();
    if (now - this.lastAmbientMs < this.ambientDelayMs * 0.6) return;
    this.lastAmbientMs = now;

    const config = AMBIENT_MODES[this.ambientMode];
    const chord = config.chords[this.ambientIndex % config.chords.length];
    this.ambientIndex += 1;

    chord.forEach((frequency, idx) => {
      playTone({
        frequency,
        durationMs: 1100 + idx * 120,
        gain: config.gain * (idx === 0 ? 1 : 0.8),
        category: 'music',
        gameId: this.gameId
      });
    });
  }
}
