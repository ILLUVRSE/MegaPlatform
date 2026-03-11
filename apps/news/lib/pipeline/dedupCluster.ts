export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const term of setA) {
    if (setB.has(term)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function shouldJoinCluster(opts: {
  canonicalUrlA: string;
  canonicalUrlB: string;
  contentA: string;
  contentB: string;
  threshold: number;
}): boolean {
  if (opts.canonicalUrlA === opts.canonicalUrlB) {
    return true;
  }

  return jaccardSimilarity(opts.contentA, opts.contentB) >= opts.threshold;
}
