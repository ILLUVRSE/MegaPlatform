import { describe, expect, it } from 'vitest';
import { FoosballMultiplayerAdapter } from './adapters/foosball';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('foosball multiplayer integration', () => {
  it('syncs rods, ball, and duel progression via host snapshots/events', () => {
    const started = createStartedRoom('FOOS', 3030);
    const hostAdapter = new FoosballMultiplayerAdapter();
    const clientAdapter = new FoosballMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'] } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'] } });
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
        if (packet.message.type === 'snapshot') clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
        if (packet.message.type === 'event') clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
      }
    );

    for (let tick = 0; tick < 1000; tick += 1) {
      const phase = tick / 1000;
      hostAdapter.onInput({ rodOffset: Math.sin(phase * 8) * 120, rodGesture: Math.cos(phase * 7), selectedRod: 1, playerIndex: 0 });
      sendInputToHost(clientTransport, tick, {
        rodOffset: Math.cos(phase * 9) * 120,
        rodGesture: Math.sin(phase * 6),
        selectedRod: 2,
        playerIndex: 1
      });

      const events = hostAdapter.step(1 / 120);
      if (tick % 6 === 0) sendSnapshotFromHost(hostTransport, tick, hostAdapter.getSnapshot());
      for (const event of events) sendEventFromHost(hostTransport, event);
      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().score).toEqual(hostAdapter.getSnapshot().score);
    expect(clientAdapter.getSnapshot().lastEventId).toBe(hostAdapter.getSnapshot().lastEventId);
    expect(hostAdapter.getSnapshot().tick).toBeGreaterThan(0);
  });
});
