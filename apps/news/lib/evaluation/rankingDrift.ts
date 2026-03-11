export function calculateRankingDrift(previousTop: string[], currentTop: string[]): { score: number; changedPositions: number } {
  const prevIndex = new Map(previousTop.map((id, index) => [id, index]));
  let moved = 0;

  for (let i = 0; i < currentTop.length; i += 1) {
    const id = currentTop[i];
    if (!id) {
      moved += 1;
      continue;
    }
    const prev = prevIndex.get(id);
    if (prev === undefined || Math.abs(prev - i) >= 5) {
      moved += 1;
    }
  }

  const score = Number((moved / Math.max(1, currentTop.length)).toFixed(4));
  return { score, changedPositions: moved };
}
