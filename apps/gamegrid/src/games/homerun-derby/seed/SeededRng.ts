export interface SeededRng {
  next: () => number;
  nextInt: (minInclusive: number, maxInclusive: number) => number;
  getState: () => number;
}

export function mulberry32(seed: number): SeededRng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt: (minInclusive, maxInclusive) => {
      const min = Math.ceil(minInclusive);
      const max = Math.floor(maxInclusive);
      if (max <= min) return min;
      return min + Math.floor(next() * ((max - min) + 1));
    },
    getState: () => state >>> 0
  };
}

export function hashStringToSeed(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}
