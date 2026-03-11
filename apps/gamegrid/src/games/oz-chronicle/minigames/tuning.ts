import { createSeededRng, hashStringToSeed } from '../rng';

export interface DifficultyPreset {
  id: string;
  multiplier: number;
}

export function resolveDeterministicPreset(seed: number, miniGameId: string, presets: readonly DifficultyPreset[]): DifficultyPreset {
  if (presets.length === 0) {
    throw new Error('Presets cannot be empty');
  }
  const mixed = (seed ^ hashStringToSeed(miniGameId)) >>> 0;
  const rng = createSeededRng(mixed);
  const index = rng.nextInt(0, presets.length - 1);
  const safeIndex = Math.abs(index) % presets.length;
  return presets[safeIndex] ?? presets[0];
}
