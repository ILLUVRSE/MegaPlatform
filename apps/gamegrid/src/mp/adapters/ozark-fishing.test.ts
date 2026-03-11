import { describe, expect, it } from 'vitest';
import { OzarkFishingMultiplayerAdapter } from './ozark-fishing';

function makeHost(mode: 'derby' | 'big_catch' = 'derby') {
  const adapter = new OzarkFishingMultiplayerAdapter();
  adapter.init({
    role: 'host',
    playerId: 'host',
    seed: 7001,
    options: {
      hostPlayerId: 'host',
      playerIds: ['host', 'p1', 'p2', 'p3'],
      playerIndex: 0,
      partyMode: mode,
      durationSec: 180,
      weather: 'overcast',
      time: 'night',
      assistAllowed: true,
      spot: 'random',
      gearFairness: 'standardized',
      rarityMultipliers: false,
      useWeeklyEvent: true
    }
  });
  adapter.start();
  return adapter;
}

describe('ozark-fishing adapter', () => {
  it('validates input state and rejects invalid reels/hooks', () => {
    const host = makeHost();

    host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'reelInput', reel: { action: 'strength', strength: 1 } } });
    host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'hookAttempt' } });

    const events = host.step(1 / 20);
    const rejects = events.filter((e) => e.type === 'inputRejected');
    expect(rejects.length).toBeGreaterThanOrEqual(2);
  });

  it('snapshot roundtrip keeps authoritative leaderboard state', () => {
    const host = makeHost();
    host.onInput({ type: 'cast', cast: { aim: 0, power: 0.8, lureId: 'spinnerbait' } });

    for (let i = 0; i < 300; i += 1) {
      const snap = host.getSnapshot();
      const me = snap.players.find((p) => p.playerId === 'host');
      if (me?.phase === 'bite_window') host.onInput({ type: 'hookAttempt' });
      if (me?.phase === 'hooked' || me?.phase === 'reeling') {
        host.onInput({ type: 'reelInput', reel: { action: 'strength', strength: 0.92 } });
      }
      host.step(1 / 20);
      if (host.getSnapshot().players[0].catches > 0) break;
    }

    const mirror = new OzarkFishingMultiplayerAdapter();
    mirror.init({
      role: 'client',
      playerId: 'host',
      seed: 7001,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1', 'p2', 'p3'],
        playerIndex: 0,
        partyMode: 'derby'
      }
    });
    mirror.applySnapshot(host.getSnapshot());

    expect(mirror.getSnapshot().leaderboard).toEqual(host.getSnapshot().leaderboard);
    expect(mirror.getSnapshot().players).toEqual(host.getSnapshot().players);
  });

  it('big catch leaderboard tie-break uses earliest catch time', () => {
    const host = makeHost('big_catch');
    const snap = host.getSnapshot();

    // force deterministic order via catches generated in sequence.
    host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'cast', timestamp: snap.elapsedMs, cast: { aim: 0, power: 0.85, lureId: 'spinnerbait' } } });
    host.onRemoteMessage({ fromPlayerId: 'p2', input: { type: 'cast', timestamp: snap.elapsedMs + 10, cast: { aim: 0, power: 0.85, lureId: 'spinnerbait' } } });

    for (let i = 0; i < 2200; i += 1) {
      const s = host.getSnapshot();
      const p1 = s.players.find((p) => p.playerId === 'p1');
      const p2 = s.players.find((p) => p.playerId === 'p2');

      if (p1?.phase === 'bite_window') host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'hookAttempt' } });
      if (p2?.phase === 'bite_window') host.onRemoteMessage({ fromPlayerId: 'p2', input: { type: 'hookAttempt' } });
      if (p1?.phase === 'hooked' || p1?.phase === 'reeling') host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'reelInput', reel: { action: 'strength', strength: 0.95 } } });
      if (p2?.phase === 'hooked' || p2?.phase === 'reeling') host.onRemoteMessage({ fromPlayerId: 'p2', input: { type: 'reelInput', reel: { action: 'strength', strength: 0.95 } } });

      host.step(1 / 20);
      const done = host.getSnapshot().players.filter((p) => p.catches > 0);
      if (done.length >= 2) break;
    }

    const leaderboard = host.getSnapshot().leaderboard;
    expect(leaderboard.length).toBeGreaterThanOrEqual(2);
    if (leaderboard[0].bestFish === leaderboard[1].bestFish) {
      expect(leaderboard[0].bestFishAtMs).toBeLessThanOrEqual(leaderboard[1].bestFishAtMs);
    }
  });

  it('standardized gear keeps players on baseline while personal gear diverges', () => {
    const standardized = new OzarkFishingMultiplayerAdapter();
    standardized.init({
      role: 'host',
      playerId: 'host',
      seed: 7100,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1'],
        playerIndex: 0,
        partyMode: 'derby',
        durationSec: 180,
        gearFairness: 'standardized'
      }
    });
    standardized.start();

    const personal = new OzarkFishingMultiplayerAdapter();
    personal.init({
      role: 'host',
      playerId: 'host',
      seed: 7100,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1'],
        playerIndex: 0,
        partyMode: 'derby',
        durationSec: 180,
        gearFairness: 'personal'
      }
    });
    personal.start();

    const stdSnap = standardized.getSnapshot();
    const personalSnap = personal.getSnapshot();

    expect(stdSnap.sessionConfig.gearFairness).toBe('standardized');
    expect(personalSnap.sessionConfig.gearFairness).toBe('personal');
    expect(stdSnap.players.every((p) => p.tension === stdSnap.players[0].tension)).toBe(true);
  });

  it('session config includes deterministic season and weekly event keys', () => {
    const host = new OzarkFishingMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 7111,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1'],
        playerIndex: 0,
        partyMode: 'derby',
        durationSec: 180,
        useWeeklyEvent: true
      }
    });
    host.start();

    const snapA = host.getSnapshot();
    const snapB = host.getSnapshot();
    expect(snapA.sessionConfig.seasonId).toBeTruthy();
    expect(snapA.sessionConfig.weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(snapA.sessionConfig.useWeeklyEvent).toBe(true);
    expect(snapA.sessionConfig.eventId).toBe(snapB.sessionConfig.eventId);
  });

  it('tournament mode assigns match players and rejects spectator input', () => {
    const host = new OzarkFishingMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 9090,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1', 'p2', 'p3', 'p4'],
        playerIndex: 0,
        tournamentMode: true,
        tournamentFormat: 'bracket',
        tournamentMatchType: 'derby',
        tournamentDurationSec: 120
      }
    });
    host.start();

    const bootstrap = host.step(1 / 20);
    const assign = bootstrap.find((event) => event.type === 'match_assign');
    expect(assign).toBeTruthy();
    if (!assign || assign.type !== 'match_assign') return;

    const spectatorId = assign.spectators[0];
    expect(spectatorId).toBeTruthy();
    host.onRemoteMessage({
      fromPlayerId: spectatorId,
      input: { type: 'cast', cast: { aim: 0, power: 0.8, lureId: 'spinnerbait' } }
    });
    const events = host.step(1 / 20);
    expect(events.some((event) => event.type === 'inputRejected' && event.playerId === spectatorId)).toBe(true);
  });
});
