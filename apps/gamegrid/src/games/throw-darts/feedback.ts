import type { DartHit } from './types';

function formatHitLabel(hit: DartHit): string {
  if (hit.ring === 'miss') return 'MISS';
  if (hit.isBull) return hit.ring === 'inner_bull' ? 'DBULL' : 'BULL';
  const prefix = hit.ring === 'double' ? 'D' : hit.ring === 'triple' ? 'T' : '';
  return `${prefix}${hit.number ?? ''}`.trim();
}

export function formatTurnSummary(hits: DartHit[], total: number, wasBust: boolean): string {
  if (wasBust) return 'Bust';
  if (!hits.length) return '--';
  const labels = hits.map(formatHitLabel);
  return `${labels.join(' + ')} = ${total}`;
}

export function nextHotStreak(current: number, hit: DartHit, wasBust: boolean): number {
  if (wasBust || hit.score <= 0) return 0;
  if (hit.isBull || hit.ring === 'triple') return current + 1;
  return 0;
}

export function throwFeedbackMessage(hit: DartHit, wasBust: boolean): string {
  if (wasBust) return 'Alert: Bust. Score reverts to turn start.';
  if (hit.isBull) return 'Great: Bullseye.';
  if (hit.score <= 0) return 'Tip: Missed board. Reset and throw clean.';
  return `Great: ${hit.ring.toUpperCase()} ${hit.number ?? ''} for ${hit.score}`.trim();
}
