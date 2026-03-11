import type { AIDifficulty, AIPlan, PoolBall, RuleState, TableGeometry, Vec2 } from './types';
import { legalTargetsForPlayer } from './rules';

interface Candidate {
  targetBall: number;
  pocketId: string;
  cueAim: Vec2;
  score: number;
  distanceCue: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function random(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function direction(fromX: number, fromY: number, toX: number, toY: number): Vec2 {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) return { x: 1, y: 0 };
  return { x: dx / mag, y: dy / mag };
}

function isPathClear(x0: number, y0: number, x1: number, y1: number, balls: PoolBall[], ignore: Set<number>, radius: number): boolean {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) return true;

  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed || ignore.has(b.number)) continue;
    const t = ((b.x - x0) * vx + (b.y - y0) * vy) / lenSq;
    if (t <= 0 || t >= 1) continue;
    const px = x0 + vx * t;
    const py = y0 + vy * t;
    const dx = b.x - px;
    const dy = b.y - py;
    if (dx * dx + dy * dy < (radius * 2.05) * (radius * 2.05)) return false;
  }

  return true;
}

function jitter(base: Vec2, amount: number, seed: number): Vec2 {
  const angle = (random(seed) * 2 - 1) * amount;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: base.x * cos - base.y * sin,
    y: base.x * sin + base.y * cos
  };
}

function difficultyError(difficulty: AIDifficulty): number {
  if (difficulty === 'easy') return 0.22;
  if (difficulty === 'hard') return 0.045;
  return 0.11;
}

function difficultySafetyChance(difficulty: AIDifficulty): number {
  if (difficulty === 'easy') return 0;
  if (difficulty === 'hard') return 0.42;
  return 0.22;
}

export function planAiShot(
  balls: PoolBall[],
  table: TableGeometry,
  state: RuleState,
  difficulty: AIDifficulty,
  seed: number
): AIPlan {
  const cue = balls.find((b) => b.number === 0);
  if (!cue) {
    return {
      direction: { x: -1, y: 0 },
      power: 0.4,
      spinX: 0,
      spinY: 0,
      targetBall: null,
      intendedPocketId: null,
      isSafety: false
    };
  }

  const remaining = balls.filter((b) => !b.pocketed && b.number !== 0).map((b) => b.number);
  const targets = new Set(legalTargetsForPlayer(state, remaining));
  const candidates: Candidate[] = [];

  for (let i = 0; i < balls.length; i += 1) {
    const target = balls[i];
    if (target.pocketed || !targets.has(target.number)) continue;

    for (let p = 0; p < table.pockets.length; p += 1) {
      const pocket = table.pockets[p];
      const toPocket = direction(target.x, target.y, pocket.x, pocket.y);
      const contactX = target.x - toPocket.x * table.ballRadius * 2;
      const contactY = target.y - toPocket.y * table.ballRadius * 2;
      const cueAim = direction(cue.x, cue.y, contactX, contactY);

      const clearCue = isPathClear(cue.x, cue.y, contactX, contactY, balls, new Set([0, target.number]), table.ballRadius);
      const clearTarget = isPathClear(target.x, target.y, pocket.x, pocket.y, balls, new Set([0, target.number]), table.ballRadius);
      if (!clearCue || !clearTarget) continue;

      const dCue = Math.hypot(contactX - cue.x, contactY - cue.y);
      const dPocket = Math.hypot(pocket.x - target.x, pocket.y - target.y);
      const score = 1 / (1 + dCue * 0.004 + dPocket * 0.003);

      candidates.push({
        targetBall: target.number,
        pocketId: pocket.id,
        cueAim,
        score,
        distanceCue: dCue
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    const legalBall = balls.find((b) => !b.pocketed && targets.has(b.number));
    const dir = legalBall ? direction(cue.x, cue.y, legalBall.x, legalBall.y) : { x: -1, y: 0 };
    return {
      direction: jitter(dir, difficultyError(difficulty) * 1.5, seed + 41),
      power: 0.42,
      spinX: 0,
      spinY: 0,
      targetBall: legalBall?.number ?? null,
      intendedPocketId: null,
      isSafety: true
    };
  }

  const safetyChance = difficultySafetyChance(difficulty);
  const shouldSafety = best.score < 0.23 && random(seed + 8) < safetyChance;
  if (shouldSafety) {
    return {
      direction: jitter(best.cueAim, difficultyError(difficulty), seed + 2),
      power: 0.35,
      spinX: 0,
      spinY: -0.15,
      targetBall: best.targetBall,
      intendedPocketId: best.pocketId,
      isSafety: true
    };
  }

  const basePower = clamp(best.distanceCue / 530, 0.25, 0.95);
  const spinX = difficulty === 'hard' ? (random(seed + 9) * 2 - 1) * 0.24 : 0;
  const spinY = difficulty === 'hard' ? (random(seed + 12) * 2 - 1) * 0.2 : difficulty === 'medium' ? 0.07 : 0;

  return {
    direction: jitter(best.cueAim, difficultyError(difficulty), seed + 1),
    power: basePower,
    spinX,
    spinY,
    targetBall: best.targetBall,
    intendedPocketId: best.pocketId,
    isSafety: false
  };
}
