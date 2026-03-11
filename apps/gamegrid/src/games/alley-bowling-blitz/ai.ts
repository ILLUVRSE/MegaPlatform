import { ballSpeed, createBallFromRelease, stepBall } from './physics';
import type { BowlingDifficulty, LaneModel, SwipeRelease } from './types';

export type Rng = () => number;

interface DifficultyProfile {
  angleJitter: number;
  spinJitter: number;
  speedMin: number;
  speedMax: number;
  aimBias: number;
}

const DIFFICULTY_PROFILE: Record<BowlingDifficulty, DifficultyProfile> = {
  easy: {
    angleJitter: 0.19,
    spinJitter: 1.2,
    speedMin: 360,
    speedMax: 600,
    aimBias: 42
  },
  medium: {
    angleJitter: 0.12,
    spinJitter: 0.75,
    speedMin: 440,
    speedMax: 680,
    aimBias: 24
  },
  hard: {
    angleJitter: 0.065,
    spinJitter: 0.46,
    speedMin: 540,
    speedMax: 760,
    aimBias: 14
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randSigned(rng: Rng): number {
  return rng() * 2 - 1;
}

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function generateAiRelease(lane: LaneModel, difficulty: BowlingDifficulty, rng: Rng = Math.random): SwipeRelease {
  const profile = DIFFICULTY_PROFILE[difficulty];

  const laneCenter = (lane.left + lane.right) * 0.5;
  const targetX = laneCenter + randSigned(rng) * profile.aimBias;
  const startX = clamp(targetX + randSigned(rng) * (profile.aimBias * 0.75), lane.left + 24, lane.right - 24);
  const speed = profile.speedMin + (profile.speedMax - profile.speedMin) * rng();
  const angle = clamp((targetX - startX) / 260 + randSigned(rng) * profile.angleJitter, -0.34, 0.34);
  const spin = clamp(((laneCenter - startX) / 120) + randSigned(rng) * profile.spinJitter, -2.2, 2.2);

  return {
    startX,
    startY: lane.bottom - 8,
    angle,
    speed,
    spin
  };
}

export function estimatePinsFromRelease(release: SwipeRelease, lane: LaneModel): number {
  const scratch = createBallFromRelease(release, lane);
  let t = 0;
  while (!scratch.finished && t < 4.2) {
    stepBall(scratch, lane, 1 / 120);
    t += 1 / 120;
  }

  if (scratch.inGutter) return 0;

  const speed = ballSpeed(scratch);
  const center = (lane.left + lane.right) * 0.5;
  const error = Math.abs(scratch.x - center);

  const alignment = clamp(1 - error / 150, 0, 1);
  const pace = clamp((speed - 150) / 280, 0, 1);
  const spinControl = clamp(1 - Math.abs(release.spin) / 3.5, 0.12, 1);

  const expected = 10 * alignment * 0.64 + 10 * pace * 0.24 + 10 * spinControl * 0.12;
  return clamp(Math.round(expected), 0, 10);
}
