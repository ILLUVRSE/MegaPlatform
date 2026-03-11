export function comboMultiplier(combo: number): number {
  return 1 + Math.min(5, Math.max(0, combo)) * 0.15;
}

export function consonantPayout(baseValue: number, hits: number, combo: number): number {
  return Math.round(Math.max(0, baseValue) * Math.max(0, hits) * comboMultiplier(combo));
}

export function nextCombo(currentCombo: number, wasCorrect: boolean): number {
  if (!wasCorrect) return 0;
  return Math.max(0, currentCombo) + 1;
}
