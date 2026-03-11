export interface SeededRng {
  next: () => number;
  nextInt: (maxExclusive: number) => number;
  pick: <T>(values: readonly T[]) => T;
}

export function hashSeed(seed: string | number): number {
  const value = typeof seed === 'number' ? String(seed) : seed;
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  return (h >>> 0) || 1;
}

export function createSeededRng(seed: string | number): SeededRng {
  let state = hashSeed(seed) >>> 0;

  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };

  return {
    next,
    nextInt: (maxExclusive) => {
      if (maxExclusive <= 1) return 0;
      return Math.floor(next() * maxExclusive);
    },
    pick: (values) => values[Math.floor(next() * values.length) % values.length]
  };
}
