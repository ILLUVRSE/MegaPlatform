import { describe, expect, it } from 'vitest';
import { TableTennisMultiplayerAdapter } from './table-tennis';

describe('table-tennis multiplayer adapter', () => {
  it('roundtrips snapshots via applySnapshot(getSnapshot())', () => {
    const host = new TableTennisMultiplayerAdapter();
    const client = new TableTennisMultiplayerAdapter();

    host.init({
      role: 'host',
      playerId: 'host',
      seed: 42,
      options: {
        hostPlayerId: 'host',
        playerIndex: 0,
        playerIds: ['host', 'client'],
        mode: 'best_of_3'
      }
    });

    client.init({
      role: 'client',
      playerId: 'client',
      seed: 42,
      options: {
        hostPlayerId: 'host',
        playerIndex: 1,
        playerIds: ['host', 'client'],
        mode: 'best_of_3'
      }
    });

    host.start();
    host.onInput({ targetX: 95, velX: 120, playerIndex: 0 });
    host.onRemoteMessage({ fromPlayerId: 'client', input: { targetX: -110, velX: -90, playerIndex: 1 } });

    for (let i = 0; i < 40; i += 1) {
      host.step(1 / 120);
    }

    const snapshot = host.getSnapshot();
    client.applySnapshot(snapshot);

    expect(client.getSnapshot()).toEqual(snapshot);
  });

  it('maps inputs to correct paddle by player index', () => {
    const host = new TableTennisMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 99,
      options: {
        hostPlayerId: 'host',
        playerIndex: 0,
        playerIds: ['host', 'client'],
        mode: 'quick_match'
      }
    });
    host.start();

    host.onInput({ targetX: 130, velX: 0, playerIndex: 0 });
    host.onRemoteMessage({ fromPlayerId: 'client', input: { targetX: -150, velX: 0, playerIndex: 1 } });

    for (let i = 0; i < 60; i += 1) {
      host.step(1 / 120);
    }

    const snapshot = host.getSnapshot();
    expect(snapshot.paddles.bottom.x).toBeGreaterThan(100);
    expect(snapshot.paddles.top.x).toBeLessThan(-120);
  });
});
