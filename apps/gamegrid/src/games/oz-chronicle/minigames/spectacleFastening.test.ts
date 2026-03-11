import { describe, expect, it } from 'vitest';
import {
  createSpectacleFasteningState,
  generateSpectacleSteps,
  isSpectacleFasteningPerfect,
  phaseAtTime,
  spectacleFasteningGrade,
  stepSpectacleFastening,
  DEFAULT_SPECTACLE_FASTENING_CONFIG
} from './spectacleFastening';

describe('spectacle fastening minigame', () => {
  it('generates deterministic steps for the same seed and difficulty', () => {
    const config = { ...DEFAULT_SPECTACLE_FASTENING_CONFIG, stepsMin: 3, stepsMax: 5 };
    const a = generateSpectacleSteps(8128, 1.12, config);
    const b = generateSpectacleSteps(8128, 1.12, config);
    const c = generateSpectacleSteps(8128, 0.92, config);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.length).toBeLessThanOrEqual(5);
  });

  it('applies grading boundaries S/A/B/C', () => {
    const config = DEFAULT_SPECTACLE_FASTENING_CONFIG;
    const perfectState = {
      elapsedMs: Math.round(config.durationMs * 0.62),
      steps: [],
      currentStep: 4,
      mistakes: 0,
      retryTimeMs: 0,
      done: true,
      success: true
    };
    const gradeAState = {
      ...perfectState,
      elapsedMs: Math.round(config.durationMs * 0.84),
      mistakes: 1
    };
    const gradeBState = {
      ...perfectState,
      elapsedMs: Math.round(config.durationMs * 0.96),
      mistakes: 3
    };
    const gradeCState = {
      ...perfectState,
      success: false
    };

    expect(spectacleFasteningGrade(perfectState, config)).toBe('S');
    expect(spectacleFasteningGrade(gradeAState, config)).toBe('A');
    expect(spectacleFasteningGrade(gradeBState, config)).toBe('B');
    expect(spectacleFasteningGrade(gradeCState, config)).toBe('C');
  });

  it('perfect-run unlock trigger checks S grade only', () => {
    const config = DEFAULT_SPECTACLE_FASTENING_CONFIG;
    const perfect = {
      elapsedMs: Math.round(config.durationMs * 0.6),
      steps: [],
      currentStep: 3,
      mistakes: 0,
      retryTimeMs: 0,
      done: true,
      success: true
    };
    const nonPerfect = {
      ...perfect,
      mistakes: 1
    };

    expect(isSpectacleFasteningPerfect(perfect, config)).toBe(true);
    expect(isSpectacleFasteningPerfect(nonPerfect, config)).toBe(false);
  });

  it('step resolution remains deterministic for identical tap timing', () => {
    const config = DEFAULT_SPECTACLE_FASTENING_CONFIG;
    const seed = 4444;
    const difficulty = 1;

    let a = createSpectacleFasteningState(seed, difficulty, config);
    let b = createSpectacleFasteningState(seed, difficulty, config);

    const taps = [250, 190, 340, 210, 280, 240, 300, 220];

    for (let i = 0; i < taps.length; i += 1) {
      a = stepSpectacleFastening(a, true, taps[i], config);
      b = stepSpectacleFastening(b, true, taps[i], config);
      if (a.done || b.done) break;
      a = stepSpectacleFastening(a, false, 120, config);
      b = stepSpectacleFastening(b, false, 120, config);
    }

    expect(a).toEqual(b);
    expect(phaseAtTime(900, config)).toBeCloseTo(0, 5);
  });
});
