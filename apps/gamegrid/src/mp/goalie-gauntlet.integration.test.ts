import { describe, expect, it } from 'vitest';
import { GoalieGauntletMultiplayerAdapter } from './adapters/goalie-gauntlet';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('goalie-gauntlet multiplayer integration', () => {
  it('syncs host-authoritative shot results and scoreboard', () => {
    const started = createStartedRoom('GOAL', 3031);
    const hostAdapter = new GoalieGauntletMultiplayerAdapter();
    const clientAdapter = new GoalieGauntletMultiplayerAdapter();

    hostAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: started.seed,
      options: {
        hostPlayerId: 'host',
        playerIndex: 0,
        playerIds: ['host', 'client'],
        mode: 'challenge',
        difficulty: 'medium',
        patternId: 'rapid-fire'
      }
    });

    clientAdapter.init({
      role: 'client',
      playerId: 'client',
      seed: started.seed,
      options: {
        hostPlayerId: 'host',
        playerIndex: 1,
        playerIds: ['host', 'client'],
        mode: 'challenge',
        difficulty: 'medium',
        patternId: 'rapid-fire'
      }
    });

    hostAdapter.start();
    clientAdapter.start();

    const hostTransport = new MockLoopbackTransport('host');
    const clientTransport = new MockLoopbackTransport('client');
    wireLoopback(
      hostTransport,
      clientTransport,
      (packet) => {
        if (packet.message.type === 'input') {
          hostAdapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
        }
      },
      (packet) => {
        if (packet.message.type === 'snapshot') {
          clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
        }
        if (packet.message.type === 'event') {
          clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
        }
      }
    );

    for (let tick = 0; tick < 4200; tick += 1) {
      const phase = tick / 4200;
      hostAdapter.onInput({ laneX: Math.sin(phase * 8) * 250, y: Math.cos(phase * 6), trigger: tick % 8 === 0 ? 1 : 0, t: tick * 16 });
      sendInputToHost(clientTransport, tick, {
        laneX: Math.cos(phase * 10) * 250,
        y: Math.sin(phase * 5),
        trigger: tick % 9 === 0 ? 1 : 0,
        t: tick * 16
      });

      const events = hostAdapter.step(1 / 120);
      if (tick % 10 === 0) {
        sendSnapshotFromHost(hostTransport, tick, hostAdapter.getSnapshot());
      }
      for (const event of events) {
        sendEventFromHost(hostTransport, event);
      }

      if (hostAdapter.getResult()) break;
    }

    const host = hostAdapter.getSnapshot();
    const client = clientAdapter.getSnapshot();
    expect(client.shotCursor).toBe(host.shotCursor);
    expect(client.playerScores).toEqual(host.playerScores);
    expect(client.phase).toBe(host.phase);
  });

  it('handles party launch with career mode by falling back without crashing', () => {
    const started = createStartedRoom('GOAL', 8181);
    const hostAdapter = new GoalieGauntletMultiplayerAdapter();
    const clientAdapter = new GoalieGauntletMultiplayerAdapter();

    hostAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: started.seed,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'client'],
        mode: 'career',
        dayKey: '2026-02-15'
      }
    });

    clientAdapter.init({
      role: 'client',
      playerId: 'client',
      seed: started.seed,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'client'],
        mode: 'career',
        dayKey: '2026-02-15'
      }
    });

    hostAdapter.start();
    clientAdapter.start();

    const events = hostAdapter.step(1 / 60);
    for (const event of events) {
      clientAdapter.applyEvent(event);
    }
    clientAdapter.applySnapshot(hostAdapter.getSnapshot());

    expect(hostAdapter.getSnapshot().mode).toBe('ranked');
    expect(clientAdapter.getSnapshot().mode).toBe('ranked');
    expect(hostAdapter.getSnapshot().patternId).toBe('ranked:2026-02-15');
  });
});
