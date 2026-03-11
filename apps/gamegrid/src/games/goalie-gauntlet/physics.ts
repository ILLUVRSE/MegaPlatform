import type { GoalieBody, SaveResult, ShotRuntime, ShotSpawn } from './types';

const GOAL_LINE_Y = 628;
const DEFLECT_DAMPING_X = 0.88;
const DEFLECT_SPEED_Y = -420;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function laneToX(lane: -1 | 0 | 1): number {
  if (lane === -1) return 430;
  if (lane === 1) return 850;
  return 640;
}

export function spawnShot(id: number, shot: ShotSpawn, nowMs: number): ShotRuntime {
  const startX = laneToX(shot.lane);
  const curveAccel = shot.type === 'curve' ? (shot.lane === 0 ? 120 : -shot.lane * 95) : 0;
  const vx = shot.type === 'one_timer' ? shot.lane * 30 : 0;
  const vy = shot.type === 'one_timer' ? shot.speed * 1.16 : shot.speed;

  return {
    ...shot,
    id,
    x: startX,
    y: 80,
    vx,
    vy,
    curveAccel,
    active: true,
    spawnedAtMs: nowMs
  };
}

export function stepShot(shot: ShotRuntime, dtSec: number): void {
  if (!shot.active) return;
  shot.vx += shot.curveAccel * dtSec;
  shot.x += shot.vx * dtSec;
  shot.y += shot.vy * dtSec;
}

export function shotCrossedGoalLine(shot: ShotRuntime): boolean {
  return shot.active && shot.y >= GOAL_LINE_Y;
}

export function detectSave(shot: ShotRuntime, goalie: GoalieBody, assist: boolean, nowMs: number): SaveResult {
  const widthBonus = assist ? 20 : 0;
  const sideBias = goalie.gloveBias ? 14 : 0;

  const left = goalie.x - goalie.width * 0.5 - widthBonus - sideBias;
  const right = goalie.x + goalie.width * 0.5 + widthBonus + (goalie.gloveBias ? 4 : 0);
  const top = goalie.y - goalie.height * 0.5 - 10;
  const bottom = goalie.y + goalie.height * 0.5 + 10;

  const inside = shot.x >= left && shot.x <= right && shot.y >= top && shot.y <= bottom;
  if (!inside) {
    return {
      saved: false,
      deflected: false,
      perfect: false,
      reactionMs: Math.max(0, nowMs - shot.spawnedAtMs),
      side: 'center'
    };
  }

  const centerDx = Math.abs(shot.x - goalie.x);
  const perfect = centerDx <= goalie.width * 0.14 && Math.abs(shot.vx) < 80;
  const side = shot.x < goalie.x - goalie.width * 0.1 ? 'glove' : shot.x > goalie.x + goalie.width * 0.1 ? 'stick' : 'center';

  shot.vx = clamp(-shot.vx * DEFLECT_DAMPING_X + (goalie.x - shot.x) * 2.1, -360, 360);
  shot.vy = DEFLECT_SPEED_Y - (perfect ? 60 : 0);
  shot.curveAccel *= -0.4;

  return {
    saved: true,
    deflected: true,
    perfect,
    reactionMs: Math.max(0, nowMs - shot.spawnedAtMs),
    side
  };
}

export function isShotOut(shot: ShotRuntime): boolean {
  return shot.x < 260 || shot.x > 1020 || shot.y < -120 || shot.y > 760;
}
