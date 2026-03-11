import type { SwipePoint } from '../input/SwipeSwingController';

export interface SwipeReplayEntry {
  startTimeMs: number;
  endTimeMs: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angleRad: number;
  speedPxPerMs: number;
  path: SwipePoint[];
}

export interface ReplayRunLog {
  seed: number;
  startedAtMs: number;
  completedAtMs: number | null;
  inputs: SwipeReplayEntry[];
}

export function createReplayRunLog(seed: number, startedAtMs: number): ReplayRunLog {
  return {
    seed,
    startedAtMs,
    completedAtMs: null,
    inputs: []
  };
}

export function appendReplayInput(log: ReplayRunLog, entry: SwipeReplayEntry): void {
  log.inputs.push(entry);
}

export function closeReplayRunLog(log: ReplayRunLog, completedAtMs: number): void {
  log.completedAtMs = completedAtMs;
}
