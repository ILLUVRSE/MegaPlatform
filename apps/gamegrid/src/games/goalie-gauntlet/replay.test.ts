import { describe, expect, it } from 'vitest';
import { buildShotSchedule, loadShotPatterns } from './patterns';
import { ReplayRecorder, simulateReplayOutcome } from './replay';

describe('goalie-gauntlet replay determinism', () => {
  it('reproduces identical score outcome from recorded input stream', () => {
    const setup = {
      mode: 'challenge' as const,
      difficulty: 'medium' as const,
      controls: 'drag' as const,
      sensitivity: 'medium' as const,
      options: {
        assistLaneIndicator: true,
        warmup: false,
        haptics: false,
        reducedMotion: false,
        lowQuality: false,
        preLaneIndicator: true
      }
    };

    const schedule = buildShotSchedule(loadShotPatterns(), {
      seed: 8080,
      mode: 'challenge',
      difficulty: 'medium',
      patternId: 'perfect-streak',
      shotCount: 12
    });

    const recorder = new ReplayRecorder({
      setup,
      seed: 8080,
      patternId: schedule.patternId,
      shots: schedule.shots
    });

    for (let i = 0; i < schedule.shots.length; i += 1) {
      const shot = schedule.shots[i];
      recorder.recordInput({
        zone: shot.zone,
        changedAtMs: shot.arriveAtMs - 80,
        gestureType: 'drag',
        actionType: 'standard'
      });
    }

    const replay = recorder.finalize(0);
    const first = simulateReplayOutcome(replay);
    replay.expectedScore = first.score;
    const second = simulateReplayOutcome(replay);

    expect(first.score).toBe(second.score);
    expect(first.score).toBeGreaterThan(0);
    expect(second.score).toBe(replay.expectedScore);
  });
});
