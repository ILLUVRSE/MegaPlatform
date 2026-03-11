import type { BallState, LaneModel, SwipeRelease } from './types';

const MIN_SPEED = 22;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createLaneModel(width: number, height: number): LaneModel {
  const laneWidth = Math.min(460, Math.max(360, width * 0.37));
  const left = width * 0.5 - laneWidth * 0.5;
  const right = width * 0.5 + laneWidth * 0.5;
  return {
    left,
    right,
    top: 100,
    bottom: height - 34,
    gutterWidth: 34,
    pinDeckY: 148,
    oilBreakProgress: 0.38,
    baseFriction: 0.2,
    lateFriction: 0.44,
    hookStrength: 150
  };
}

export function createBallFromRelease(release: SwipeRelease, lane: LaneModel): BallState {
  const clampedX = clamp(release.startX, lane.left + 24, lane.right - 24);
  return {
    x: clampedX,
    y: lane.bottom - 6,
    vx: Math.sin(release.angle) * release.speed,
    vy: -Math.cos(release.angle) * release.speed,
    spin: release.spin,
    active: true,
    inGutter: false,
    finished: false
  };
}

export function estimateDownLaneProgress(y: number, lane: LaneModel): number {
  return clamp((lane.bottom - y) / (lane.bottom - lane.pinDeckY), 0, 1);
}

export function stepBall(ball: BallState, lane: LaneModel, dt: number): void {
  if (!ball.active || ball.finished) return;

  const progress = estimateDownLaneProgress(ball.y, lane);

  const hookRamp = smoothstep(lane.oilBreakProgress, 1, progress);
  ball.vx += ball.spin * lane.hookStrength * hookRamp * dt;

  const friction = lane.baseFriction + lane.lateFriction * progress;
  const damp = Math.max(0, 1 - friction * dt);
  ball.vx *= damp;
  ball.vy *= damp;

  if (ball.inGutter) {
    const gutterCenter = ball.x < lane.left ? lane.left - lane.gutterWidth * 0.5 : lane.right + lane.gutterWidth * 0.5;
    ball.x += (gutterCenter - ball.x) * Math.min(1, dt * 7);
    ball.spin *= Math.max(0, 1 - dt * 5);
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (!ball.inGutter && (ball.x < lane.left || ball.x > lane.right)) {
    ball.inGutter = true;
    ball.vx *= 0.72;
  }

  const speedSq = ball.vx * ball.vx + ball.vy * ball.vy;

  if (ball.y <= lane.pinDeckY - 42 || ball.y <= lane.top - 24 || speedSq <= MIN_SPEED * MIN_SPEED) {
    ball.active = false;
    ball.finished = true;
  }
}

export function ballSpeed(ball: BallState): number {
  return Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
}
