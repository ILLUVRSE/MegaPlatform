import { clamp } from '../../shared/math';
import type { MatchSnapshotState } from '../../shared/net/protocol';

export interface PredictedPlayerState {
  id: string;
  x: number;
  y: number;
}

export const computeStateError = (predicted: PredictedPlayerState[], authoritative: MatchSnapshotState): number => {
  let total = 0;
  for (const p of predicted) {
    const auth = authoritative.players.find((x) => x.id === p.id);
    if (!auth) {
      continue;
    }
    total += Math.hypot(auth.x - p.x, auth.y - p.y);
  }
  return total;
};

export const shouldReconcile = (error: number, tolerance = 18): boolean => error > tolerance;

export const smoothCorrection = (current: number, target: number, alpha = 0.25): number => {
  return current + (target - current) * clamp(alpha, 0, 1);
};
