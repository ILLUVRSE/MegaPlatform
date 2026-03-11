import { describe, expect, it } from 'vitest';
import {
  audiencePerceptionGrade,
  audiencePerceptionScore,
  buildAudienceTargets,
  createAudiencePerceptionState,
  isAudiencePerceptionPerfect,
  stepAudiencePerception,
  DEFAULT_AUDIENCE_PERCEPTION_CONFIG
} from './audiencePerception';

describe('audience perception mechanic', () => {
  it('builds deterministic target patterns for same seed and difficulty', () => {
    const a = buildAudienceTargets(1301, 1);
    const b = buildAudienceTargets(1301, 1);
    const c = buildAudienceTargets(1301, 1.12);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.length).toBe(4);
  });

  it('scoring and grade boundaries remain stable', () => {
    const cfg = DEFAULT_AUDIENCE_PERCEPTION_CONFIG;
    const perfectState = {
      elapsedMs: Math.round(cfg.durationMs * 0.64),
      currentAudience: 4,
      fear: 0,
      hope: 0,
      faith: 0,
      mistakes: 0,
      targets: [],
      done: true,
      success: true
    };
    const gradeA = { ...perfectState, elapsedMs: Math.round(cfg.durationMs * 0.85), mistakes: 2 };
    const gradeB = { ...perfectState, elapsedMs: Math.round(cfg.durationMs * 0.95), mistakes: 4 };
    const fail = { ...perfectState, success: false };

    expect(audiencePerceptionGrade(perfectState, cfg)).toBe('S');
    expect(audiencePerceptionGrade(gradeA, cfg)).toBe('A');
    expect(audiencePerceptionGrade(gradeB, cfg)).toBe('B');
    expect(audiencePerceptionGrade(fail, cfg)).toBe('C');
    expect(audiencePerceptionScore(perfectState, cfg)).toBeGreaterThan(audiencePerceptionScore(gradeB, cfg));
    expect(isAudiencePerceptionPerfect(perfectState, cfg)).toBe(true);
  });

  it('advances audiences only when sealed with aligned dials', () => {
    const cfg = DEFAULT_AUDIENCE_PERCEPTION_CONFIG;
    let state = createAudiencePerceptionState(1402, 1, cfg);

    state = stepAudiencePerception(state, 'seal', 200, cfg);
    expect(state.currentAudience).toBe(0);
    expect(state.mistakes).toBe(1);

    const target = state.targets[0];
    while (state.fear !== target.fear) state = stepAudiencePerception(state, 'fear', 80, cfg);
    while (state.hope !== target.hope) state = stepAudiencePerception(state, 'hope', 80, cfg);
    while (state.faith !== target.faith) state = stepAudiencePerception(state, 'faith', 80, cfg);
    state = stepAudiencePerception(state, 'seal', 80, cfg);

    expect(state.currentAudience).toBe(1);
  });
});
