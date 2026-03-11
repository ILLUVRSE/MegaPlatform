export interface Rng {
  next: () => number;
  nextInt: (maxExclusive: number) => number;
}

function hashSeed(seed: string | number): number {
  const text = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(initial: number): () => number {
  let t = initial >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number = Date.now()): Rng {
  const next = mulberry32(hashSeed(seed));
  return {
    next,
    nextInt: (maxExclusive: number) => {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    }
  };
}
