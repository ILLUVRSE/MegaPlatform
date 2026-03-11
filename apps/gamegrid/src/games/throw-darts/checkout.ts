export function suggestCheckout(remaining: number): string | null {
  if (remaining <= 1) return null;
  if (remaining === 50) return 'DBULL';
  if (remaining <= 40 && remaining % 2 === 0) return `D${remaining / 2}`;
  if (remaining <= 40 && remaining % 2 === 1) return `S${remaining - 1} → D1`;

  if (remaining <= 100) {
    const t20 = remaining - 60;
    if (t20 > 1 && t20 <= 40 && t20 % 2 === 0) return `T20 → D${t20 / 2}`;
    const s20 = remaining - 20;
    if (s20 > 1 && s20 <= 40 && s20 % 2 === 0) return `S20 → D${s20 / 2}`;
  }

  if (remaining <= 120) {
    const t19 = remaining - 57;
    if (t19 > 1 && t19 <= 40 && t19 % 2 === 0) return `T19 → D${t19 / 2}`;
  }

  if (remaining <= 170) {
    return 'T20 setup';
  }

  return null;
}
