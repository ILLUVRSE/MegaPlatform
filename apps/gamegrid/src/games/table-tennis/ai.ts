import type { AiDecision, AiProfile, BallState, PlayerIndex, TableTennisDifficulty } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const PROFILE_BY_DIFFICULTY: Record<TableTennisDifficulty, AiProfile> = {
  easy: {
    reactionMs: 280,
    moveSpeed: 520,
    missChance: 0.2,
    spinControl: 0.3,
    aggression: 0.2
  },
  medium: {
    reactionMs: 190,
    moveSpeed: 690,
    missChance: 0.12,
    spinControl: 0.52,
    aggression: 0.45
  },
  hard: {
    reactionMs: 120,
    moveSpeed: 860,
    missChance: 0.06,
    spinControl: 0.78,
    aggression: 0.64
  }
};

export function getAiProfile(difficulty: TableTennisDifficulty): AiProfile {
  return PROFILE_BY_DIFFICULTY[difficulty];
}

export function predictBallXAtY(ball: BallState, targetY: number): number {
  if (Math.abs(ball.vy) < 0.001) return ball.x;
  const t = (targetY - ball.y) / ball.vy;
  if (t <= 0) return ball.x;
  return ball.x + ball.vx * t + 0.5 * ball.spinX * 0.015 * t * t;
}

export function decideAiReturn(
  difficulty: TableTennisDifficulty,
  ball: BallState,
  rng: () => number,
  side: PlayerIndex,
  tableHalfWidth: number
): AiDecision {
  const profile = getAiProfile(difficulty);
  const aggressive = rng() < profile.aggression;
  const miss = rng() < profile.missChance;

  const corner = rng() < 0.5 ? -1 : 1;
  const safeX = clamp(-ball.x * 0.45, -tableHalfWidth * 0.55, tableHalfWidth * 0.55);
  const attackX = clamp(corner * tableHalfWidth * 0.82, -tableHalfWidth * 0.9, tableHalfWidth * 0.9);

  const speedBase = aggressive ? 0.9 : 0.7;
  const spinPolarity = side === 1 ? 1 : -1;
  const spin = (rng() * 2 - 1) * profile.spinControl * spinPolarity;

  return {
    aimX: aggressive ? attackX : safeX,
    speed: clamp(speedBase + rng() * 0.25, 0.45, 1),
    spin,
    aggressive,
    miss
  };
}
