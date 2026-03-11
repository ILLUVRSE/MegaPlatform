export function embedTextStub(text: string): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const terms = clean.split(/\s+/).filter(Boolean);
  const buckets = new Array<number>(8).fill(0);
  for (const term of terms) {
    const code = term.charCodeAt(0) ?? 0;
    const index = code % buckets.length;
    buckets[index] = (buckets[index] ?? 0) + 1;
  }
  const magnitude = Math.sqrt(buckets.reduce((sum, value) => sum + value * value, 0)) || 1;
  return buckets.map((value) => Number((value / magnitude).toFixed(4)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i += 1) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return Number(dot.toFixed(4));
}
