import { angleBetweenNormalized, distance, normalize } from '../../shared/math';
import { TUNING } from '../config/tuning';
import type { PassCandidate, Vec2 } from '../../shared/types';

export const selectPassTarget = (
  origin: Vec2,
  aim: Vec2,
  candidates: PassCandidate[],
  maxDistance = 420,
  aimConeDeg: number = TUNING.ball.passAimConeDeg
): PassCandidate | null => {
  const aimNorm = normalize(aim);
  if (Math.hypot(aimNorm.x, aimNorm.y) < 1e-5) {
    return null;
  }

  const coneRad = (aimConeDeg * Math.PI) / 180;
  let best: PassCandidate | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const c of candidates) {
    if (!c.fromBallOwner) {
      continue;
    }
    const offset = { x: c.position.x - origin.x, y: c.position.y - origin.y };
    const dist = distance(origin, c.position);
    if (dist > maxDistance || dist < 1) {
      continue;
    }
    const dir = normalize(offset);
    const angle = angleBetweenNormalized(aimNorm, dir);
    if (angle > coneRad * 0.5) {
      continue;
    }
    const angleScore = 1 - angle / (coneRad * 0.5);
    const distanceScore = 1 - dist / maxDistance;
    const score = angleScore * 0.7 + distanceScore * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
};
