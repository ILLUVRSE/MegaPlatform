import trickShotsRaw from '../../content/pool-trickshots.json';
import type { PoolBall, TrickShotCatalog, TrickShotDefinition, TrickShotProgress } from './types';

const STORAGE_KEY = 'gamegrid.pool.trickshots.v1';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isTrickShot(value: unknown): value is TrickShotDefinition {
  if (!isObject(value)) return false;
  if (value.variant !== 'eight_ball' && value.variant !== 'nine_ball') return false;
  if (!Array.isArray(value.balls) || value.balls.length < 2) return false;
  if (!isObject(value.goal)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    value.goal.type === 'pocket_ball' &&
    typeof value.goal.ballNumber === 'number' &&
    (typeof value.goal.pocketId === 'undefined' || typeof value.goal.pocketId === 'string') &&
    value.balls.every(
      (b) =>
        isObject(b) && typeof b.number === 'number' && typeof b.x === 'number' && typeof b.y === 'number' && Number.isFinite(b.x) && Number.isFinite(b.y)
    )
  );
}

export function loadTrickShotCatalog(): TrickShotCatalog {
  const parsed = trickShotsRaw as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('pool-trickshots.json must export an array');
  }

  const shots = parsed.filter(isTrickShot);
  if (shots.length < 10) {
    throw new Error(`Pool trick shots require at least 10 valid entries. Found ${shots.length}.`);
  }

  const ids = new Set<string>();
  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    if (ids.has(shot.id)) throw new Error(`Duplicate trick shot id: ${shot.id}`);
    ids.add(shot.id);

    const cueCount = shot.balls.filter((b) => b.number === 0).length;
    if (cueCount !== 1) {
      throw new Error(`Trick shot ${shot.id} must define exactly one cue ball (number 0).`);
    }
  }

  return { shots };
}

export function loadTrickShotProgress(): TrickShotProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestAttempts: {} };
    const parsed = JSON.parse(raw) as { bestAttempts?: Record<string, number> };
    return {
      bestAttempts: parsed.bestAttempts ?? {}
    };
  } catch {
    return { bestAttempts: {} };
  }
}

export function saveTrickShotProgress(progress: TrickShotProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // no-op
  }
}

export function evaluateTrickShotSuccess(shot: TrickShotDefinition, pocketedThisShot: number[], _balls: PoolBall[]): boolean {
  if (!pocketedThisShot.includes(shot.goal.ballNumber)) return false;
  return true;
}
