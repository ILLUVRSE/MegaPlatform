import { trackAssetLoad } from './perfMonitor';

export type AudioCategory = 'sfx' | 'music';

interface ToneOptions {
  frequency: number;
  durationMs: number;
  gain: number;
  category: AudioCategory;
  gameId?: string;
}

const DEFAULT_CATEGORY_VOLUMES: Record<AudioCategory, number> = {
  sfx: 1,
  music: 0.7
};

const DEFAULT_CATEGORY_MUTED: Record<AudioCategory, boolean> = {
  sfx: false,
  music: false
};

let audioContext: AudioContext | null = null;
let unlocked = false;
let muted = false;
const categoryVolumes: Record<AudioCategory, number> = { ...DEFAULT_CATEGORY_VOLUMES };
const categoryMuted: Record<AudioCategory, boolean> = { ...DEFAULT_CATEGORY_MUTED };
const perGameVolumes = new Map<string, Record<AudioCategory, number>>();
const bufferCache = new Map<string, AudioBuffer>();

function getContextCtor(): typeof AudioContext | null {
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

function resolveVolume(category: AudioCategory, gameId?: string) {
  if (muted || categoryMuted[category]) return 0;
  const base = categoryVolumes[category] ?? 1;
  if (!gameId) return base;
  const perGame = perGameVolumes.get(gameId);
  if (!perGame) return base;
  const gameVolume = perGame[category];
  return typeof gameVolume === 'number' ? base * gameVolume : base;
}

export async function unlockAudioContext(): Promise<void> {
  if (unlocked) return;
  const Ctor = getContextCtor();
  if (!Ctor) {
    unlocked = true;
    return;
  }
  try {
    if (!audioContext) audioContext = new Ctor();
    if (audioContext.state === 'suspended') await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(0);
    oscillator.stop(audioContext.currentTime + 0.01);
  } finally {
    unlocked = true;
  }
}

export function isAudioUnlocked() {
  return unlocked;
}

export function setMuted(value: boolean) {
  muted = value;
  if (!audioContext) return;
  if (muted && audioContext.state !== 'suspended') {
    void audioContext.suspend();
  }
  if (!muted && audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}

export function setCategoryVolume(category: AudioCategory, volume: number) {
  categoryVolumes[category] = Math.max(0, Math.min(1, volume));
}

export function setCategoryMuted(category: AudioCategory, value: boolean) {
  categoryMuted[category] = value;
}

export function setGameCategoryVolume(gameId: string, category: AudioCategory, volume: number) {
  const current = perGameVolumes.get(gameId) ?? { ...DEFAULT_CATEGORY_VOLUMES };
  current[category] = Math.max(0, Math.min(1, volume));
  perGameVolumes.set(gameId, current);
}

export async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url) ?? null;
  if (!audioContext) await unlockAudioContext();
  const context = audioContext;
  if (!context) return null;
  try {
    return await trackAssetLoad(`audio:${url}`, async () => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      bufferCache.set(url, buffer);
      return buffer;
    });
  } catch {
    return null;
  }
}

export function playBuffer(options: { buffer: AudioBuffer; category: AudioCategory; gameId?: string; gain?: number }) {
  if (!audioContext || muted) return;
  const volume = resolveVolume(options.category, options.gameId);
  if (volume <= 0) return;
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = (options.gain ?? 1) * volume;
  source.buffer = options.buffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start();
}

export function playTone({ frequency, durationMs, gain, category, gameId }: ToneOptions) {
  if (!audioContext || muted) return;
  const volume = resolveVolume(category, gameId);
  if (volume <= 0) return;
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;
  const finalGain = gain * volume;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(finalGain, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, durationMs / 1000));
  osc.frequency.value = frequency;
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + Math.max(0.03, durationMs / 1000));
}

export function resetAudioManager() {
  bufferCache.clear();
  perGameVolumes.clear();
  categoryVolumes.sfx = DEFAULT_CATEGORY_VOLUMES.sfx;
  categoryVolumes.music = DEFAULT_CATEGORY_VOLUMES.music;
  categoryMuted.sfx = DEFAULT_CATEGORY_MUTED.sfx;
  categoryMuted.music = DEFAULT_CATEGORY_MUTED.music;
}
