function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeDuckGain(baseGain: number, duckAmount: number): number {
  return clamp01(baseGain) * (1 - clamp01(duckAmount));
}

export function seededUnit(seed: number): number {
  let state = seed >>> 0;
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0x100000000;
}

export interface AudioMixState {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  dynamicMix: boolean;
  tension: number;
  inFight: boolean;
}

export class OzarkAudioMixController {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;
  private ambientOscA: OscillatorNode | null = null;
  private ambientOscB: OscillatorNode | null = null;
  private tensionOsc: OscillatorNode | null = null;

  private biteDuckSec = 0;
  private catchDuckSec = 0;
  private reelClickCooldownSec = 0;

  init(context: AudioContext | null): void {
    if (!context || this.context) return;
    this.context = context;

    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.sfxGain = context.createGain();
    this.duckGain = context.createGain();
    this.ambientGain = context.createGain();
    this.tensionGain = context.createGain();

    this.masterGain.gain.value = 1;
    this.musicGain.gain.value = 0;
    this.sfxGain.gain.value = 0;
    this.duckGain.gain.value = 1;
    this.ambientGain.gain.value = 0.12;
    this.tensionGain.gain.value = 0;

    this.ambientOscA = context.createOscillator();
    this.ambientOscA.type = 'sine';
    this.ambientOscA.frequency.value = 112;

    this.ambientOscB = context.createOscillator();
    this.ambientOscB.type = 'triangle';
    this.ambientOscB.frequency.value = 168;

    this.tensionOsc = context.createOscillator();
    this.tensionOsc.type = 'sawtooth';
    this.tensionOsc.frequency.value = 186;

    this.ambientOscA.connect(this.ambientGain);
    this.ambientOscB.connect(this.ambientGain);
    this.tensionOsc.connect(this.tensionGain);

    this.ambientGain.connect(this.duckGain);
    this.tensionGain.connect(this.duckGain);
    this.duckGain.connect(this.musicGain);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(context.destination);

    this.ambientOscA.start();
    this.ambientOscB.start();
    this.tensionOsc.start();
  }

  update(dt: number, state: AudioMixState): void {
    if (!this.context || !this.masterGain || !this.musicGain || !this.sfxGain || !this.duckGain || !this.tensionGain) return;

    const clampedDt = Math.max(0, Math.min(0.05, dt));
    this.reelClickCooldownSec = Math.max(0, this.reelClickCooldownSec - clampedDt);
    this.biteDuckSec = Math.max(0, this.biteDuckSec - clampedDt);
    this.catchDuckSec = Math.max(0, this.catchDuckSec - clampedDt);

    const now = this.context.currentTime;
    const musicTarget = state.muted ? 0 : clamp01(state.musicVolume);
    const sfxTarget = state.muted ? 0 : clamp01(state.sfxVolume);
    this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(sfxTarget, now, 0.06);

    const tensionTarget = state.dynamicMix && state.inFight ? clamp01(state.tension) * 0.18 : 0;
    this.tensionGain.gain.setTargetAtTime(tensionTarget, now, 0.08);

    const duckAmount = state.dynamicMix ? (this.catchDuckSec > 0 ? 0.32 : this.biteDuckSec > 0 ? 0.18 : 0) : 0;
    this.duckGain.gain.setTargetAtTime(computeDuckGain(1, duckAmount), now, 0.05);
  }

  noteBiteCue(): void {
    this.biteDuckSec = Math.max(this.biteDuckSec, 0.2);
    this.playSfxTone(622, 0.035, 'square', 0.06);
  }

  noteHookSet(): void {
    this.playSfxTone(298, 0.045, 'triangle', 0.08);
  }

  noteReelClick(intensity: number): void {
    if (this.reelClickCooldownSec > 0) return;
    this.reelClickCooldownSec = 0.08;
    this.playSfxTone(132 + clamp01(intensity) * 60, 0.03, 'triangle', 0.042 + clamp01(intensity) * 0.05);
  }

  noteTensionCreak(intensity: number): void {
    this.playSfxTone(98 + clamp01(intensity) * 42, 0.03, 'sawtooth', 0.035 + clamp01(intensity) * 0.05);
  }

  noteSplash(seed: number): void {
    const offset = seededUnit(seed) * 90;
    this.playSfxTone(220 + offset, 0.06, 'sine', 0.05);
  }

  noteCatch(): void {
    this.catchDuckSec = Math.max(this.catchDuckSec, 0.3);
    this.playVictorySting();
  }

  playVictorySting(): void {
    this.playSfxTone(524, 0.07, 'sine', 0.08);
    this.playSfxTone(786, 0.09, 'triangle', 0.07);
  }

  dispose(): void {
    if (this.ambientOscA) this.ambientOscA.stop();
    if (this.ambientOscB) this.ambientOscB.stop();
    if (this.tensionOsc) this.tensionOsc.stop();
    this.ambientOscA = null;
    this.ambientOscB = null;
    this.tensionOsc = null;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.duckGain = null;
    this.ambientGain = null;
    this.tensionGain = null;
  }

  private playSfxTone(freqHz: number, durationSec: number, type: OscillatorType, gainPeak: number): void {
    if (!this.context || !this.sfxGain) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.value = freqHz;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.context.currentTime;
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainPeak), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }
}
