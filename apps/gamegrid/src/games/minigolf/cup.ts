import { MINIGOLF_CUP_TUNING } from './gameplayTheme';
import type { BallState, MinigolfHole } from './types';

export interface CupCheckResult {
  captured: boolean;
  lipOut: boolean;
  lipStrength: number;
}

function vecLen(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function checkCupInteraction(ball: BallState, hole: MinigolfHole): CupCheckResult {
  const dx = hole.cup.x - ball.x;
  const dy = hole.cup.y - ball.y;
  const dist = vecLen(dx, dy);
  const speed = vecLen(ball.vx, ball.vy);
  const captureRadius = Math.max(2, hole.cup.radius * MINIGOLF_CUP_TUNING.captureRadiusFactor - ball.radius * 0.33);
  const rimRadius = Math.max(captureRadius + 2, hole.cup.radius * MINIGOLF_CUP_TUNING.rimRadiusFactor);

  if (dist <= captureRadius && speed <= MINIGOLF_CUP_TUNING.captureSpeed) {
    const nx = dist > 1e-6 ? dx / dist : 0;
    const ny = dist > 1e-6 ? dy / dist : 0;
    const towardCupSpeed = ball.vx * nx + ball.vy * ny;
    if (towardCupSpeed >= -MINIGOLF_CUP_TUNING.flyByDotThreshold) {
      return { captured: true, lipOut: false, lipStrength: 0 };
    }
  }

  if (dist <= rimRadius && speed > MINIGOLF_CUP_TUNING.captureSpeed * 0.9 && speed < MINIGOLF_CUP_TUNING.captureSpeed * 2.6) {
    return { captured: false, lipOut: true, lipStrength: MINIGOLF_CUP_TUNING.lipDeflectStrength };
  }

  return { captured: false, lipOut: false, lipStrength: 0 };
}

export function applyCupLipOut(ball: BallState, hole: MinigolfHole, strength: number) {
  const dx = ball.x - hole.cup.x;
  const dy = ball.y - hole.cup.y;
  const dist = vecLen(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  const tangentX = -ny;
  const tangentY = nx;
  const tangentSpeed = ball.vx * tangentX + ball.vy * tangentY;
  ball.vx = tangentX * tangentSpeed + nx * strength;
  ball.vy = tangentY * tangentSpeed + ny * strength;
  ball.x += nx * 1.5;
  ball.y += ny * 1.5;
}
