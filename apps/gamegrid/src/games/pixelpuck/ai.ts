import type { PaddleState, PixelPuckDifficulty, PuckState, RinkGeometry } from './types';

interface AiParams {
  maxSpeed: number;
  accel: number;
  reaction: number;
  missScale: number;
  attackBias: number;
}

const AI_PARAMS: Record<PixelPuckDifficulty, AiParams> = {
  easy: { maxSpeed: 700, accel: 1800, reaction: 0.20, missScale: 80, attackBias: 0.2 },
  medium: { maxSpeed: 980, accel: 2600, reaction: 0.12, missScale: 36, attackBias: 0.45 },
  hard: { maxSpeed: 1220, accel: 3400, reaction: 0.07, missScale: 20, attackBias: 0.65 }
};

export interface AiState {
  thinkCooldown: number;
  targetX: number;
  targetY: number;
}

export function createAiState(rink: RinkGeometry): AiState {
  return {
    thinkCooldown: 0,
    targetX: rink.bounds.x + rink.bounds.width * 0.5,
    targetY: rink.bounds.y + rink.bounds.height * 0.25
  };
}

export function stepAi(
  ai: PaddleState,
  puck: PuckState,
  rink: RinkGeometry,
  difficulty: PixelPuckDifficulty,
  state: AiState,
  dt: number,
  rngUnit: number
): AiState {
  const params = AI_PARAMS[difficulty];
  let thinkCooldown = state.thinkCooldown - dt;
  let targetX = state.targetX;
  let targetY = state.targetY;

  if (thinkCooldown <= 0) {
    const halfY = rink.bounds.y + rink.bounds.height * 0.5;
    let interceptX = puck.x;
    const headingUp = puck.vy < -20;
    if (headingUp) {
      const deltaY = halfY - puck.y;
      const t = deltaY / puck.vy;
      interceptX = puck.x + puck.vx * t;
    }

    const missOffset = (rngUnit - 0.5) * params.missScale;
    const clampedX = Math.max(rink.bounds.x + ai.radius, Math.min(rink.bounds.x + rink.bounds.width - ai.radius, interceptX));
    const homeY = rink.bounds.y + rink.bounds.height * 0.22;
    const attackY = rink.bounds.y + rink.bounds.height * 0.38;

    targetX = clampedX + missOffset;
    targetY = headingUp ? attackY * params.attackBias + homeY * (1 - params.attackBias) : homeY;
    thinkCooldown = params.reaction;
  }

  const dx = targetX - ai.x;
  const dy = targetY - ai.y;
  const desiredVx = Math.max(-params.maxSpeed, Math.min(params.maxSpeed, dx * 8));
  const desiredVy = Math.max(-params.maxSpeed, Math.min(params.maxSpeed, dy * 8));

  const ax = Math.max(-params.accel, Math.min(params.accel, (desiredVx - ai.vx) / dt));
  const ay = Math.max(-params.accel, Math.min(params.accel, (desiredVy - ai.vy) / dt));

  ai.vx += ax * dt;
  ai.vy += ay * dt;

  const speed = Math.hypot(ai.vx, ai.vy);
  if (speed > params.maxSpeed) {
    const inv = params.maxSpeed / speed;
    ai.vx *= inv;
    ai.vy *= inv;
  }

  ai.x += ai.vx * dt;
  ai.y += ai.vy * dt;

  const minX = rink.bounds.x + ai.radius;
  const maxX = rink.bounds.x + rink.bounds.width - ai.radius;
  const minY = rink.bounds.y + ai.radius;
  const maxY = rink.bounds.y + rink.bounds.height * 0.5 - ai.radius;
  ai.x = Math.max(minX, Math.min(maxX, ai.x));
  ai.y = Math.max(minY, Math.min(maxY, ai.y));

  return { thinkCooldown, targetX, targetY };
}
