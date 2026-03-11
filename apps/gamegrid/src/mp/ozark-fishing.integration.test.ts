import { describe, expect, it } from 'vitest';
import { OzarkFishingMultiplayerAdapter } from './adapters/ozark-fishing';

function createAdapter(role: 'host' | 'client', playerId: string, seed: number, playerIds: string[]) {
  const adapter = new OzarkFishingMultiplayerAdapter();
  adapter.init({
    role,
    playerId,
    seed,
    options: {
      hostPlayerId: playerIds[0],
      playerIds,
      playerIndex: playerIds.indexOf(playerId),
      partyMode: 'derby',
      durationSec: 180,
      weather: 'overcast',
      time: 'day',
      assistAllowed: true,
      spot: 'random',
      gearFairness: 'standardized',
      rarityMultipliers: false
    }
  });
  adapter.start();
  return adapter;
}

describe('ozark-fishing multiplayer integration', () => {
  it('syncs 4-player derby leaderboard and session end deterministically', () => {
    const playerIds = ['host', 'p1', 'p2', 'p3'];
    const host = createAdapter('host', 'host', 5151, playerIds);
    const clients = playerIds.slice(1).map((id) => createAdapter('client', id, 5151, playerIds));

    const hookedByPlayer = new Set<string>();
    const castEveryMs = 1400;

    for (let tick = 0; tick < 4000; tick += 1) {
      const snapshot = host.getSnapshot();
      const nowMs = snapshot.elapsedMs;

      for (let i = 0; i < playerIds.length; i += 1) {
        const playerId = playerIds[i];
        const state = snapshot.players.find((entry) => entry.playerId === playerId);
        if (!state) continue;

        if ((nowMs + i * 120) % castEveryMs < 50 && (state.phase === 'idle' || state.phase === 'cooldown')) {
          const input = {
            type: 'cast' as const,
            timestamp: nowMs,
            cast: {
              aim: i * 0.1 - 0.2,
              power: 0.72,
              lureId: 'spinnerbait'
            }
          };
          if (playerId === 'host') host.onInput(input);
          else host.onRemoteMessage({ fromPlayerId: playerId, input });
        }

        if (state.phase === 'bite_window' && !hookedByPlayer.has(playerId)) {
          const input = { type: 'hookAttempt' as const, timestamp: nowMs + 120 };
          if (playerId === 'host') host.onInput(input);
          else host.onRemoteMessage({ fromPlayerId: playerId, input });
          hookedByPlayer.add(playerId);
        }

        if (state.phase !== 'bite_window') {
          hookedByPlayer.delete(playerId);
        }

        if (state.phase === 'hooked' || state.phase === 'reeling') {
          const input = {
            type: 'reelInput' as const,
            timestamp: nowMs,
            reel: {
              action: 'strength' as const,
              strength: 0.88
            }
          };
          if (playerId === 'host') host.onInput(input);
          else host.onRemoteMessage({ fromPlayerId: playerId, input });
        }
      }

      const events = host.step(1 / 20);
      const hostSnapshot = host.getSnapshot();

      for (let c = 0; c < clients.length; c += 1) {
        for (let e = 0; e < events.length; e += 1) {
          clients[c].applyEvent(events[e]);
        }
        clients[c].applySnapshot(hostSnapshot);
      }

      if (hostSnapshot.phase === 'ended') break;
    }

    const finalHost = host.getSnapshot();
    expect(finalHost.phase).toBe('ended');
    expect(finalHost.leaderboard.length).toBe(4);
    expect(finalHost.leaderboard[0].totalWeight).toBeGreaterThanOrEqual(finalHost.leaderboard[1].totalWeight);

    for (let i = 0; i < clients.length; i += 1) {
      const snap = clients[i].getSnapshot();
      expect(snap.leaderboard).toEqual(finalHost.leaderboard);
      expect(snap.remainingMs).toBe(finalHost.remainingMs);
    }
  });

  it('rejects invalid hook attempts and supports reconnect snapshot reclaim', () => {
    const playerIds = ['host', 'p1', 'p2', 'p3'];
    const host = createAdapter('host', 'host', 8881, playerIds);
    const clientP1 = createAdapter('client', 'p1', 8881, playerIds);

    host.onRemoteMessage({ fromPlayerId: 'p1', input: { type: 'hookAttempt', timestamp: 0 } });
    const firstEvents = host.step(1 / 20);
    expect(firstEvents.some((event) => event.type === 'inputRejected')).toBe(true);

    // simulate active match
    for (let tick = 0; tick < 160; tick += 1) {
      const snap = host.getSnapshot();
      if (tick % 25 === 0) {
        host.onRemoteMessage({
          fromPlayerId: 'p1',
          input: {
            type: 'cast',
            timestamp: snap.elapsedMs,
            cast: { aim: 0.1, power: 0.75, lureId: 'spinnerbait' }
          }
        });
      }
      host.step(1 / 20);
      clientP1.applySnapshot(host.getSnapshot());
    }

    // reconnect/reclaim by creating a fresh adapter with same playerId
    const rejoined = createAdapter('client', 'p1', 8881, playerIds);
    rejoined.applySnapshot(host.getSnapshot());

    expect(rejoined.getSnapshot().players.find((p) => p.playerId === 'p1')).toEqual(host.getSnapshot().players.find((p) => p.playerId === 'p1'));
  });

  it('keeps ice derby deterministic with identical seed and inputs', () => {
    const playerIds = ['host', 'p1'];
    const host = createAdapter('host', 'host', 9191, playerIds);
    const mirror = createAdapter('client', 'p1', 9191, playerIds);

    host.init({
      role: 'host',
      playerId: 'host',
      seed: 9191,
      options: {
        hostPlayerId: 'host',
        playerIds,
        playerIndex: 0,
        partyMode: 'derby',
        durationSec: 180,
        weather: 'overcast',
        time: 'night',
        useWeeklyEvent: true,
        iceFishing: true
      }
    });
    host.start();

    for (let i = 0; i < 300; i += 1) {
      const snap = host.getSnapshot();
      const me = snap.players.find((p) => p.playerId === 'host');
      if (me && (me.phase === 'idle' || me.phase === 'cooldown') && i % 40 === 0) {
        host.onInput({ type: 'cast', cast: { aim: 0, power: 0.8, lureId: 'spinnerbait' } });
      }
      if (me?.phase === 'bite_window') host.onInput({ type: 'hookAttempt' });
      if (me?.phase === 'hooked' || me?.phase === 'reeling') host.onInput({ type: 'reelInput', reel: { action: 'strength', strength: 0.9 } });
      const events = host.step(1 / 20);
      for (let e = 0; e < events.length; e += 1) mirror.applyEvent(events[e]);
      mirror.applySnapshot(host.getSnapshot());
    }

    expect(mirror.getSnapshot().sessionConfig.iceFishing).toBe(true);
    expect(mirror.getSnapshot().leaderboard).toEqual(host.getSnapshot().leaderboard);
  });

  it('includes deterministic tournament config and emits tournament lifecycle events', () => {
    const playerIds = ['host', 'p1', 'p2', 'p3'];
    const host = new OzarkFishingMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 9898,
      options: {
        hostPlayerId: 'host',
        playerIds,
        playerIndex: 0,
        tournamentMode: true,
        tournamentFormat: 'bracket',
        tournamentMatchType: 'derby',
        tournamentDurationSec: 120
      }
    });
    host.start();
    const events = host.step(1 / 20);
    const snapshot = host.getSnapshot();

    expect(snapshot.sessionConfig.tournamentMode).toBe(true);
    expect(snapshot.sessionConfig.tournamentFormat).toBe('bracket');
    expect(snapshot.sessionConfig.tournamentMatchType).toBe('derby');
    expect(snapshot.tournament?.id).toBeTruthy();
    expect(events.some((event) => event.type === 'tournament_create')).toBe(true);
    expect(events.some((event) => event.type === 'tournament_start')).toBe(true);
    expect(events.some((event) => event.type === 'match_assign')).toBe(true);
  });
});
