import drillsRaw from '../../content/foosball-drills.json';
import type { ActiveDrillState, DrillCatalog, DrillDefinition, DrillEvent, DrillProgress, RodRole } from './types';

const STORAGE_KEY = 'gamegrid.foosball.drills.v1';
const VALID_ROLES: readonly RodRole[] = ['goalkeeper', 'defense', 'midfield', 'strikers'] as const;

function isRole(value: unknown): value is RodRole {
  return VALID_ROLES.includes(value as RodRole);
}

function isDrill(value: unknown): value is DrillDefinition {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const goal = rec.goal as Record<string, unknown>;
  const start = rec.startBall as Record<string, unknown>;

  const goalTypeOk = goal?.type === 'score' || goal?.type === 'block' || goal?.type === 'pass_chain';
  const activeRods = rec.activeRods;
  const lockedRods = rec.lockedRods;

  return (
    typeof rec.id === 'string' &&
    typeof rec.title === 'string' &&
    typeof rec.instructions === 'string' &&
    goalTypeOk &&
    typeof goal?.target === 'number' &&
    goal.target > 0 &&
    (typeof rec.timeLimitSec === 'undefined' || typeof rec.timeLimitSec === 'number') &&
    typeof start?.x === 'number' &&
    typeof start?.y === 'number' &&
    typeof start?.vx === 'number' &&
    typeof start?.vy === 'number' &&
    Array.isArray(activeRods) &&
    activeRods.length > 0 &&
    activeRods.every(isRole) &&
    Array.isArray(lockedRods) &&
    lockedRods.every(isRole)
  );
}

export function loadFoosballDrills(): DrillCatalog {
  const parsed = drillsRaw as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('foosball-drills.json must export an array');
  }

  const drills = parsed.filter(isDrill);
  if (drills.length < 10) {
    throw new Error(`Foosball drills require at least 10 valid entries. Found ${drills.length}.`);
  }

  const idSet = new Set<string>();
  for (let i = 0; i < drills.length; i += 1) {
    const drill = drills[i];
    if (idSet.has(drill.id)) {
      throw new Error(`Duplicate foosball drill id: ${drill.id}`);
    }
    idSet.add(drill.id);
  }

  return { drills };
}

export function loadDrillProgress(): DrillProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {} };
    const parsed = JSON.parse(raw) as { completed?: Record<string, boolean> };
    return {
      completed: parsed.completed ?? {}
    };
  } catch {
    return { completed: {} };
  }
}

export function saveDrillProgress(progress: DrillProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // no-op when persistence is unavailable
  }
}

export function createActiveDrillState(drill: DrillDefinition): ActiveDrillState {
  return {
    drillId: drill.id,
    goalType: drill.goal.type,
    target: drill.goal.target,
    progress: 0,
    remainingMs: typeof drill.timeLimitSec === 'number' ? drill.timeLimitSec * 1000 : null,
    completed: false,
    failed: false
  };
}

export function tickDrillState(state: ActiveDrillState, deltaMs: number): ActiveDrillState {
  if (state.completed || state.failed) return state;
  if (state.remainingMs === null) return state;

  const remainingMs = Math.max(0, state.remainingMs - deltaMs);
  if (remainingMs > 0) {
    return {
      ...state,
      remainingMs
    };
  }

  return {
    ...state,
    remainingMs: 0,
    failed: !state.completed
  };
}

export function applyDrillEvent(state: ActiveDrillState, event: DrillEvent): ActiveDrillState {
  if (state.completed || state.failed) return state;

  const mappedType = event.type === 'pass' ? 'pass_chain' : event.type;
  if (mappedType !== state.goalType) return state;

  const nextProgress = Math.min(state.target, state.progress + Math.max(1, event.amount ?? 1));
  return {
    ...state,
    progress: nextProgress,
    completed: nextProgress >= state.target
  };
}
