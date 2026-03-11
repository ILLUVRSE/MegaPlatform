import type { GhostPoint, GhostRun } from './types';

interface RecorderState {
  points: GhostPoint[];
  elapsedMs: number;
  sampleEveryMs: number;
  nextSampleMs: number;
}

export interface GhostRecorder {
  reset: () => void;
  tick: (dtMs: number, x: number, y: number) => void;
  flush: (holeId: string) => GhostRun;
}

export interface GhostReplay {
  reset: () => void;
  tick: (dtMs: number) => void;
  sample: (out: { x: number; y: number; visible: boolean }) => void;
  getElapsedMs: () => number;
}

export function createGhostRecorder(sampleEveryMs = 50): GhostRecorder {
  const state: RecorderState = {
    points: [],
    elapsedMs: 0,
    sampleEveryMs,
    nextSampleMs: 0
  };

  return {
    reset: () => {
      state.points.length = 0;
      state.elapsedMs = 0;
      state.nextSampleMs = 0;
    },
    tick: (dtMs, x, y) => {
      state.elapsedMs += dtMs;
      while (state.elapsedMs >= state.nextSampleMs) {
        state.points.push({ t: state.elapsedMs, x, y });
        state.nextSampleMs += state.sampleEveryMs;
      }
    },
    flush: (holeId) => ({
      holeId,
      points: state.points.slice()
    })
  };
}

export function createGhostReplay(points: readonly GhostPoint[]): GhostReplay {
  let elapsedMs = 0;

  return {
    reset: () => {
      elapsedMs = 0;
    },
    tick: (dtMs) => {
      elapsedMs += dtMs;
    },
    sample: (out) => {
      if (points.length === 0) {
        out.visible = false;
        return;
      }

      if (elapsedMs <= points[0].t) {
        out.x = points[0].x;
        out.y = points[0].y;
        out.visible = true;
        return;
      }

      for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        if (elapsedMs <= current.t) {
          const previous = points[i - 1];
          const span = Math.max(1, current.t - previous.t);
          const alpha = (elapsedMs - previous.t) / span;
          out.x = previous.x + (current.x - previous.x) * alpha;
          out.y = previous.y + (current.y - previous.y) * alpha;
          out.visible = true;
          return;
        }
      }

      const tail = points[points.length - 1];
      out.x = tail.x;
      out.y = tail.y;
      out.visible = true;
    },
    getElapsedMs: () => elapsedMs
  };
}
