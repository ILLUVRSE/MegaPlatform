import type { DartHit } from './types';

const SEGMENT_ORDER: readonly number[] = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;

const STANDARD_RADII = {
  innerBull: 6.35 / 170,
  outerBull: 15.9 / 170,
  tripleInner: 99 / 170,
  tripleOuter: 107 / 170,
  doubleInner: 162 / 170,
  doubleOuter: 170 / 170
} as const;

function normalizeTheta(theta: number): number {
  const twoPi = Math.PI * 2;
  let value = theta % twoPi;
  if (value < 0) value += twoPi;
  return value;
}

export interface DartboardGeometry {
  centerX: number;
  centerY: number;
  radius: number;
}

export function scoreDartboardHit(x: number, y: number, board: DartboardGeometry): DartHit {
  const dx = x - board.centerX;
  const dy = y - board.centerY;
  const radial = Math.sqrt(dx * dx + dy * dy);
  const normalized = radial / board.radius;

  if (normalized > STANDARD_RADII.doubleOuter) {
    return {
      ring: 'miss',
      number: null,
      score: 0,
      multiplier: 0,
      isDouble: false,
      isBull: false,
      radial,
      theta: 0
    };
  }

  if (normalized <= STANDARD_RADII.innerBull) {
    return {
      ring: 'inner_bull',
      number: 25,
      score: 50,
      multiplier: 2,
      isDouble: true,
      isBull: true,
      radial,
      theta: 0
    };
  }

  if (normalized <= STANDARD_RADII.outerBull) {
    return {
      ring: 'outer_bull',
      number: 25,
      score: 25,
      multiplier: 1,
      isDouble: false,
      isBull: true,
      radial,
      theta: 0
    };
  }

  const thetaFromTop = normalizeTheta(Math.atan2(dy, dx) + Math.PI / 2);
  const segmentSize = (Math.PI * 2) / 20;
  const segmentIndex = Math.floor(thetaFromTop / segmentSize) % 20;
  const base = SEGMENT_ORDER[segmentIndex];

  if (normalized >= STANDARD_RADII.doubleInner) {
    return {
      ring: 'double',
      number: base,
      score: base * 2,
      multiplier: 2,
      isDouble: true,
      isBull: false,
      radial,
      theta: thetaFromTop
    };
  }

  if (normalized >= STANDARD_RADII.tripleInner && normalized <= STANDARD_RADII.tripleOuter) {
    return {
      ring: 'triple',
      number: base,
      score: base * 3,
      multiplier: 3,
      isDouble: false,
      isBull: false,
      radial,
      theta: thetaFromTop
    };
  }

  return {
    ring: 'single',
    number: base,
    score: base,
    multiplier: 1,
    isDouble: false,
    isBull: false,
    radial,
    theta: thetaFromTop
  };
}

export function polarToBoardPoint(
  radiusNormalized: number,
  thetaFromTop: number,
  board: DartboardGeometry
): { x: number; y: number } {
  const radial = radiusNormalized * board.radius;
  const thetaFromXAxis = thetaFromTop - Math.PI / 2;
  return {
    x: board.centerX + Math.cos(thetaFromXAxis) * radial,
    y: board.centerY + Math.sin(thetaFromXAxis) * radial
  };
}

export const DARTBOARD_RADII = STANDARD_RADII;
