import { autoSelectRodIndex } from './rods';
import type { AiState, BallState, FoosballDifficulty, KickIntent, RodState, TableBounds } from './types';

interface DifficultyProfile {
  reactionMs: number;
  speedScale: number;
  shotPower: number;
  missChance: number;
  passChance: number;
}

const PROFILES: Record<FoosballDifficulty, DifficultyProfile> = {
  easy: {
    reactionMs: 320,
    speedScale: 0.66,
    shotPower: 0.84,
    missChance: 0.32,
    passChance: 0.12
  },
  medium: {
    reactionMs: 180,
    speedScale: 0.86,
    shotPower: 1,
    missChance: 0.15,
    passChance: 0.34
  },
  hard: {
    reactionMs: 120,
    speedScale: 1,
    shotPower: 1.15,
    missChance: 0.08,
    passChance: 0.44
  }
};

export function createAiState(): AiState {
  return {
    nextReactionAtMs: 0,
    missUntilMs: 0,
    lastKickAtMs: -2000,
    passBias: 0,
    focusRodIndex: 0
  };
}

export function stepAiRods(
  state: AiState,
  rods: RodState[],
  ball: BallState,
  bounds: TableBounds,
  difficulty: FoosballDifficulty,
  nowMs: number,
  rand: () => number
): void {
  const profile = PROFILES[difficulty];

  if (nowMs >= state.nextReactionAtMs) {
    state.nextReactionAtMs = nowMs + profile.reactionMs;
    state.focusRodIndex = autoSelectRodIndex(ball.x, rods);

    if (rand() < profile.missChance) {
      state.missUntilMs = nowMs + profile.reactionMs * 2;
    }
  }

  for (let i = 0; i < rods.length; i += 1) {
    const rod = rods[i];
    const speedBase = rod.speed * profile.speedScale;
    rod.speed = speedBase;

    let targetY = ball.y;
    if (i !== state.focusRodIndex) {
      targetY = bounds.centerY + (ball.y - bounds.centerY) * 0.42;
    }

    if (nowMs < state.missUntilMs && i === state.focusRodIndex) {
      const missOffset = (rand() - 0.5) * 140;
      targetY += missOffset;
    }

    rod.targetY = targetY;
  }
}

export function decideAiKick(
  state: AiState,
  difficulty: FoosballDifficulty,
  nowMs: number,
  rand: () => number,
  rodIndex: number
): KickIntent | null {
  const profile = PROFILES[difficulty];
  if (nowMs - state.lastKickAtMs < 350) return null;
  state.lastKickAtMs = nowMs;

  const doPass = (difficulty === 'medium' || difficulty === 'hard') && rand() < profile.passChance + state.passBias;
  state.passBias = doPass ? 0 : Math.min(0.3, state.passBias + 0.05);

  return {
    rodIndex,
    strength: profile.shotPower,
    isPass: doPass
  };
}
