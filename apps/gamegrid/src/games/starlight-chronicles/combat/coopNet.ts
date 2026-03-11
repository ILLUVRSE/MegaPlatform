export interface RateGateState {
  windowStartMs: number;
  count: number;
}

export function allowRate(state: RateGateState, nowMs: number, maxPerSecond: number): { allowed: boolean; next: RateGateState } {
  if (nowMs - state.windowStartMs >= 1000) {
    const next = { windowStartMs: nowMs, count: 1 };
    return { allowed: true, next };
  }

  const next = { windowStartMs: state.windowStartMs, count: state.count + 1 };
  return { allowed: next.count <= maxPerSecond, next };
}

export function batchDamageAmounts(queue: number[], maxBatch = 4): { batched: number; remaining: number[] } {
  if (queue.length === 0) return { batched: 0, remaining: [] };
  const take = Math.max(1, Math.min(maxBatch, queue.length));
  const slice = queue.slice(0, take);
  const batched = slice.reduce((sum, value) => sum + Math.max(0, value), 0);
  return {
    batched,
    remaining: queue.slice(take)
  };
}
