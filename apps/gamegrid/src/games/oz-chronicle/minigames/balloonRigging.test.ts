import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BALLOON_RIGGING_CONFIG,
  balloonRiggingScore,
  createBalloonRiggingState,
  generateBalloonRigSteps,
  isBalloonRiggingPerfect,
  stepBalloonRigging
} from './balloonRigging';

describe('balloon rigging minigame', () => {
  it('generates deterministic rigging steps for same seed and node', () => {
    const a = generateBalloonRigSteps(3001, 1, 'balloon-rigging');
    const b = generateBalloonRigSteps(3001, 1, 'balloon-rigging');
    const c = generateBalloonRigSteps(3001, 1.12, 'balloon-rigging');

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('scores successful runs above failed runs', () => {
    const cfg = DEFAULT_BALLOON_RIGGING_CONFIG;
    let fail = createBalloonRiggingState(3002, 1.12, 'balloon-rigging', cfg);
    for (let i = 0; i < 10; i += 1) {
      fail = stepBalloonRigging(fail, false, 1300, cfg);
      if (fail.done) break;
    }

    const win = {
      ...createBalloonRiggingState(3003, 0.92, 'balloon-rigging', cfg),
      elapsedMs: Math.round(cfg.durationMs * 0.66),
      currentStep: 5,
      steps: createBalloonRiggingState(3003, 0.92, 'balloon-rigging', cfg).steps.slice(0, 5),
      mistakes: 0,
      done: true,
      success: true
    };

    expect(win.success).toBe(true);
    expect(fail.success).toBe(false);
    expect(balloonRiggingScore(win, cfg)).toBeGreaterThan(balloonRiggingScore(fail, cfg));
  });

  it('computes perfect boundaries', () => {
    const cfg = DEFAULT_BALLOON_RIGGING_CONFIG;
    const perfect = {
      ...createBalloonRiggingState(3004, 1, 'balloon-rigging', cfg),
      elapsedMs: Math.round(cfg.durationMs * 0.7),
      currentStep: 4,
      steps: createBalloonRiggingState(3004, 1, 'balloon-rigging', cfg).steps.slice(0, 4),
      mistakes: 0,
      done: true,
      success: true
    };

    const nonPerfect = {
      ...perfect,
      mistakes: 1
    };

    expect(isBalloonRiggingPerfect(perfect, cfg)).toBe(true);
    expect(isBalloonRiggingPerfect(nonPerfect, cfg)).toBe(false);
  });
});
