import { describe, expect, it } from 'vitest';
import { createDefaultProgression } from './progression';
import { applyReelInputEvent, createCastSession, replayCastSessionWithPath } from './rules';
import {
  MAX_REPLAY_EVENTS,
  MAX_REPLAY_SAMPLES,
  addReplayToProgression,
  appendReplayEvent,
  appendReplaySample,
  createReplayDraft,
  finalizeReplayDraft,
  replayDeterministicPath
} from './replay';

describe('ozark replay system', () => {
  it('deterministic replay reproduces final stamina path and final state', () => {
    const seed = 9485;
    const initialStamina = 120;
    const session = createCastSession(seed, initialStamina);

    for (let i = 0; i < 60; i += 1) {
      applyReelInputEvent(session, i * 33, i % 3 === 0 ? 0.88 : 0.41, 0.82, 0.7, 1.1, 1.02);
    }

    const draft = createReplayDraft({
      fishId: 'walleye',
      fishName: 'Walleye',
      rarityTier: 'Rare',
      weightLb: 7.2,
      spotId: 'open-water',
      weather: 'overcast',
      timeOfDay: 'night',
      playerLevel: 4,
      seed,
      hookQuality: 'good',
      initialFishStamina: initialStamina
    });

    for (let i = 0; i < session.eventLog.length; i += 1) {
      const event = session.eventLog[i];
      appendReplayEvent(draft, event);
      if (event.type === 'reel') {
        appendReplaySample(draft, {
          tMs: event.tMs,
          reelPower: Number(event.payload.reelPower ?? 0),
          tension: Number(event.payload.fishPull ?? 0.3),
          fishStamina: Math.max(0, initialStamina - i)
        });
      }
    }

    const replay = finalizeReplayDraft(draft);
    const replayed = replayCastSessionWithPath(seed, initialStamina, replay.eventLog);
    const replayPath = replayDeterministicPath(replay);

    expect(replayed.final.outcome).toBe(session.reelState.outcome);
    expect(replayed.final.fishStamina).toBeCloseTo(session.reelState.fishStamina, 8);
    expect(replayed.path.length).toBe(replayPath.length);
  });

  it('replay insert does not mutate unrelated progression fields', () => {
    const base = createDefaultProgression();
    const replay = finalizeReplayDraft(
      createReplayDraft({
        fishId: 'bluegill',
        fishName: 'Bluegill',
        rarityTier: 'Common',
        weightLb: 0.9,
        spotId: 'cove',
        weather: 'sunny',
        timeOfDay: 'day',
        playerLevel: 1,
        seed: 11,
        hookQuality: 'perfect',
        initialFishStamina: 40
      })
    );

    const next = addReplayToProgression(base, replay);
    expect(next.xp).toBe(base.xp);
    expect(next.level).toBe(base.level);
    expect(next.catches).toEqual(base.catches);
    expect(next.replays.length).toBe(1);
  });

  it('replay logs and stored list are bounded', () => {
    const draft = createReplayDraft({
      fishId: 'carp',
      fishName: 'Carp',
      rarityTier: 'Rare',
      weightLb: 10,
      spotId: 'river-mouth',
      weather: 'sunny',
      timeOfDay: 'day',
      playerLevel: 3,
      seed: 77,
      hookQuality: 'good',
      initialFishStamina: 100
    });

    for (let i = 0; i < MAX_REPLAY_EVENTS + 100; i += 1) {
      appendReplayEvent(draft, {
        tMs: i,
        type: 'reel',
        payload: { reelPower: 0.5, rodFlexMultiplier: 0.8, dragSetting: 0.7 }
      });
    }
    for (let i = 0; i < MAX_REPLAY_SAMPLES + 100; i += 1) {
      appendReplaySample(draft, { tMs: i, reelPower: 0.5, tension: 0.7, fishStamina: 100 - i * 0.1 });
    }
    const replay = finalizeReplayDraft(draft);
    expect(replay.eventLog.length).toBeLessThanOrEqual(MAX_REPLAY_EVENTS);
    expect(replay.samples.length).toBeLessThanOrEqual(MAX_REPLAY_SAMPLES);

    let state = createDefaultProgression();
    for (let i = 0; i < 70; i += 1) {
      state = addReplayToProgression(
        state,
        {
          ...replay,
          id: `r-${i}`,
          createdAt: i
        }
      );
    }
    expect(state.replays.length).toBe(50);
  });
});
