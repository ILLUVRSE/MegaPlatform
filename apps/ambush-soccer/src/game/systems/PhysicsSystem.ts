import { TUNING } from '../config/tuning';
import { clamp, length, normalize } from '../../shared/math';
import type { ArenaBounds } from '../../shared/types';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';

const applyExponentialFriction = (v: number, dt: number, frictionPerSecond: number): number =>
  v * Math.pow(frictionPerSecond, dt);

export const computeShotPower = (chargeSec: number): number => {
  const t = clamp(chargeSec / TUNING.ball.shootChargeTimeSec, 0, 1);
  const curved = t * t * (3 - 2 * t);
  return TUNING.ball.shootMinPower + (TUNING.ball.shootMaxPower - TUNING.ball.shootMinPower) * curved;
};

export const updateStamina = (stamina: number, sprinting: boolean, dt: number): number => {
  const delta = sprinting ? -TUNING.player.staminaDrainPerSec * dt : TUNING.player.staminaRecoverPerSec * dt;
  return clamp(stamina + delta, 0, TUNING.player.staminaMax);
};

export const isBallInGoal = (
  ballX: number,
  ballY: number,
  ballRadius: number,
  goal: { x: number; y: number; width: number; height: number }
): boolean => {
  const nearestX = clamp(ballX, goal.x, goal.x + goal.width);
  const nearestY = clamp(ballY, goal.y, goal.y + goal.height);
  const dx = ballX - nearestX;
  const dy = ballY - nearestY;
  return dx * dx + dy * dy <= ballRadius * ballRadius;
};

export class PhysicsSystem {
  step(ball: Ball, players: Player[], dt: number, bounds: ArenaBounds): void {
    this.updatePlayers(players, dt);
    this.updateBall(ball, dt, bounds);
  }

  private updatePlayers(players: Player[], dt: number): void {
    for (const p of players) {
      p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);
      const speed = length(p.velocity);
      const decel = TUNING.player.deceleration * dt;
      if (speed > 0) {
        const nextSpeed = Math.max(0, speed - decel);
        if (nextSpeed === 0) {
          p.velocity.x = 0;
          p.velocity.y = 0;
        } else {
          const dir = normalize(p.velocity);
          p.velocity.x = dir.x * nextSpeed;
          p.velocity.y = dir.y * nextSpeed;
        }
      }
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.x = clamp(p.position.x, TUNING.player.radius, TUNING.arena.width - TUNING.player.radius);
      p.position.y = clamp(p.position.y, TUNING.player.radius, TUNING.arena.height - TUNING.player.radius);
    }
  }

  private updateBall(ball: Ball, dt: number, bounds: ArenaBounds): void {
    ball.velocity.x = applyExponentialFriction(ball.velocity.x, dt, TUNING.ball.frictionPerSecond);
    ball.velocity.y = applyExponentialFriction(ball.velocity.y, dt, TUNING.ball.frictionPerSecond);

    const speed = length(ball.velocity);
    if (speed > TUNING.ball.maxSpeed) {
      const dir = normalize(ball.velocity);
      ball.velocity.x = dir.x * TUNING.ball.maxSpeed;
      ball.velocity.y = dir.y * TUNING.ball.maxSpeed;
    }

    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;

    const r = ball.radius;

    if (ball.position.x - r < bounds.left) {
      ball.position.x = bounds.left + r;
      ball.velocity.x = Math.abs(ball.velocity.x) * TUNING.arena.wallRestitution;
      ball.velocity.y *= TUNING.arena.wallTangentialFriction;
    } else if (ball.position.x + r > bounds.right) {
      ball.position.x = bounds.right - r;
      ball.velocity.x = -Math.abs(ball.velocity.x) * TUNING.arena.wallRestitution;
      ball.velocity.y *= TUNING.arena.wallTangentialFriction;
    }

    if (ball.position.y - r < bounds.top) {
      ball.position.y = bounds.top + r;
      ball.velocity.y = Math.abs(ball.velocity.y) * TUNING.arena.wallRestitution;
      ball.velocity.x *= TUNING.arena.wallTangentialFriction;
    } else if (ball.position.y + r > bounds.bottom) {
      ball.position.y = bounds.bottom - r;
      ball.velocity.y = -Math.abs(ball.velocity.y) * TUNING.arena.wallRestitution;
      ball.velocity.x *= TUNING.arena.wallTangentialFriction;
    }
  }
}
