import { describe, expect, it } from 'vitest';
import { createReplayRunLog, appendReplayInput } from './ReplayLog';
import { runReplaySimulation } from './runReplay';

function makeLog(seed: number) {
  const log = createReplayRunLog(seed, 0);
  appendReplayInput(log, {
    startTimeMs: 100,
    endTimeMs: 190,
    startX: 610,
    startY: 560,
    endX: 710,
    endY: 510,
    angleRad: -0.46,
    speedPxPerMs: 1.2,
    path: [
      { x: 610, y: 560, t: 100 },
      { x: 710, y: 510, t: 190 }
    ]
  });
  appendReplayInput(log, {
    startTimeMs: 260,
    endTimeMs: 340,
    startX: 620,
    startY: 550,
    endX: 730,
    endY: 500,
    angleRad: -0.42,
    speedPxPerMs: 1.35,
    path: [
      { x: 620, y: 550, t: 260 },
      { x: 730, y: 500, t: 340 }
    ]
  });
  return log;
}

describe('homerun replay determinism', () => {
  it('reproduces identical outcomes for same seed and input log', () => {
    const a = runReplaySimulation(makeLog(0x12345678), 'medium', true);
    const b = runReplaySimulation(makeLog(0x12345678), 'medium', true);

    expect(a.stats.score).toBe(b.stats.score);
    expect(a.stats.hrCount).toBe(b.stats.hrCount);
    expect(a.stats.bestDistance).toBe(b.stats.bestDistance);
  });

  it('changes outcome when seed changes with same input log', () => {
    const a = runReplaySimulation(makeLog(0x12345678), 'medium', true);
    const b = runReplaySimulation(makeLog(0x87654321), 'medium', true);

    expect(a.stats.score === b.stats.score && a.stats.hrCount === b.stats.hrCount).toBe(false);
  });
});
