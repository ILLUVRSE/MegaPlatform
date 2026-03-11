export interface SeededRng {
  next: () => number;
  nextInt: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
}

function xorshift32(seed: number): () => number {
  let state = seed | 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) & 0xffffffff) / 0x100000000;
  };
}

export function createSeededRng(seed: number): SeededRng {
  const nextFloat = xorshift32(seed);
  return {
    next: () => nextFloat(),
    nextInt: (min: number, max: number) => {
      const lo = Math.ceil(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      const span = hi - lo + 1;
      return lo + Math.floor(nextFloat() * span);
    },
    pick: <T>(items: readonly T[]) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      return items[Math.floor(nextFloat() * items.length) % items.length];
    }
  };
}

export function hashStringToSeed(text: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
