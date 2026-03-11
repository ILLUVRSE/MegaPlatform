const xmur3 = (str: string) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class SeededRng {
  private random: () => number;

  constructor(public seed: string) {
    const seedFn = xmur3(seed);
    this.random = mulberry32(seedFn());
  }

  next(): number {
    return this.random();
  }

  nextFloat(min = 0, max = 1): number {
    return min + (max - min) * this.next();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat(min, max + 1));
  }

  pick<T>(items: T[]): T {
    return items[Math.max(0, Math.min(items.length - 1, this.nextInt(0, items.length - 1)))];
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export const deriveSeed = (seed: string, salt: string) => {
  const seedFn = xmur3(`${seed}:${salt}`);
  return seedFn().toString(16);
};

export const randomSeed = () => {
  const rand = Math.floor(Math.random() * 1_000_000_000);
  return rand.toString(16);
};
