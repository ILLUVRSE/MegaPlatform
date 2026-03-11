import { beforeEach, describe, expect, it } from 'vitest';
import { loadState, saveState } from './persistence';
import { createInitialState, markBossResult, markPackCompleted, setSpectaclesTint } from './rules';

const SAVE_KEY = 'gamegrid.oz-chronicle.save.v2';

describe('oz chronicle persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists spectacles tint setting', () => {
    let state = createInitialState(1234);
    state = setSpectaclesTint(state, false);
    saveState(state);

    const loaded = loadState(1234);
    expect(loaded.settings.spectaclesTint).toBe(false);
  });

  it('defaults spectacles tint to on for older saves', () => {
    const legacyLike = createInitialState(9911);
    const payload = {
      ...legacyLike,
      settings: {
        reducedMotion: true
      }
    };

    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    const loaded = loadState(9911);
    expect(loaded.settings.reducedMotion).toBe(true);
    expect(loaded.settings.spectaclesTint).toBe(true);
  });

  it('persists pack9 completion, scores, golden cap state, and story flags', () => {
    let state = createInitialState(9922);
    state = markPackCompleted(state, 'pack7');
    state = markPackCompleted(state, 'pack8');
    state = markPackCompleted(state, 'pack9');
    state = markBossResult(state, 'western-hold-escape', 902, 8120);
    state = markBossResult(state, 'dousing-the-shadow', 948, 7760);
    state = {
      ...state,
      goldenCap: {
        acquired: true,
        usesRemaining: 2,
        commandHistory: ['aid-rescue']
      },
      storyFlags: {
        ...state.storyFlags,
        witchDefeatedWest: true,
        winkieFreed: true,
        returnQuestUnlocked: true,
        wizardRevealed: true,
        scarecrowGifted: true,
        tinGifted: true,
        lionGifted: true,
        balloonAttempted: true,
        dorothyStillInOz: true
      }
    };
    saveState(state);

    const loaded = loadState(9922);
    expect(loaded.completedPackIds).toContain('pack7');
    expect(loaded.completedPackIds).toContain('pack8');
    expect(loaded.completedPackIds).toContain('pack9');
    expect(loaded.bestBossScores['western-hold-escape']).toBe(902);
    expect(loaded.bestBossTimesMs['western-hold-escape']).toBe(8120);
    expect(loaded.bestBossScores['dousing-the-shadow']).toBe(948);
    expect(loaded.bestBossTimesMs['dousing-the-shadow']).toBe(7760);
    expect(loaded.goldenCap.acquired).toBe(true);
    expect(loaded.goldenCap.usesRemaining).toBe(2);
    expect(loaded.goldenCap.commandHistory).toEqual(['aid-rescue']);
    expect(loaded.storyFlags.witchDefeatedWest).toBe(true);
    expect(loaded.storyFlags.winkieFreed).toBe(true);
    expect(loaded.storyFlags.returnQuestUnlocked).toBe(true);
    expect(loaded.storyFlags.wizardRevealed).toBe(true);
    expect(loaded.storyFlags.scarecrowGifted).toBe(true);
    expect(loaded.storyFlags.tinGifted).toBe(true);
    expect(loaded.storyFlags.lionGifted).toBe(true);
    expect(loaded.storyFlags.balloonAttempted).toBe(true);
    expect(loaded.storyFlags.dorothyStillInOz).toBe(true);
  });
});
