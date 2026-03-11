import { describe, expect, it } from 'vitest';
import { createMatchState, resolveSaveGrade, applyShotResolution } from './rules';
import { buildShotSchedule, loadShotPatterns } from './patterns';
import { evaluateCareerObjective, generateCareerSeason, loadCareerCatalog } from './career';

describe('goalie-gauntlet career integration flow', () => {
  it('boots career season, starts first match, and completes objective headlessly', () => {
    const careerCatalog = loadCareerCatalog();
    const season = generateCareerSeason(careerCatalog, '2026-W07', 777);
    const first = season.matches[0];

    const schedule = buildShotSchedule(loadShotPatterns(), {
      seed: 7070,
      mode: 'challenge',
      difficulty: first.difficulty,
      patternId: first.template.patternId,
      shotCount: first.template.shotCount
    });

    let state = createMatchState({
      mode: 'career',
      difficulty: first.difficulty,
      controls: 'drag',
      sensitivity: 'medium',
      options: {
        assistLaneIndicator: true,
        warmup: false,
        haptics: false,
        reducedMotion: false,
        lowQuality: false,
        preLaneIndicator: true
      }
    });

    for (let i = 0; i < schedule.shots.length; i += 1) {
      const shot = schedule.shots[i];
      const resolved = resolveSaveGrade(
        shot,
        { zone: shot.zone, changedAtMs: shot.arriveAtMs - 80, gestureType: 'drag', actionType: 'standard' },
        first.difficulty,
        shot.sequenceIndex
      );
      state = applyShotResolution(state, shot, resolved.grade, resolved.deltaMs, resolved.actionType).state;
    }

    const objectivePassed = evaluateCareerObjective(first.template.objective, {
      saves: state.stats.saves,
      goalsAllowed: state.stats.misses,
      bestStreak: state.stats.bestStreak,
      alive: state.lives > 0
    });

    expect(state.stats.shotsFaced).toBe(schedule.shots.length);
    expect(state.score).toBeGreaterThan(0);
    expect(objectivePassed).toBe(true);
  });
});
