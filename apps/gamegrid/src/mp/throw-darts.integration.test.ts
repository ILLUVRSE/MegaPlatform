import { describe, expect, it } from 'vitest';
import { ThrowDartsMultiplayerAdapter } from './adapters/throw-darts';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('throw-darts multiplayer integration', () => {
  it('syncs turn order and scoring for 301/501/cricket', () => {
    for (const mode of ['301', '501', 'cricket'] as const) {
      const started = createStartedRoom(`DART${mode}`, 4030 + mode.length);
      const hostAdapter = new ThrowDartsMultiplayerAdapter();
      const clientAdapter = new ThrowDartsMultiplayerAdapter();

      hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode } });
      clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode } });
      hostAdapter.start();
      clientAdapter.start();

      const hostTransport = new MockLoopbackTransport('host');
      const clientTransport = new MockLoopbackTransport('client');
      wireLoopback(
        hostTransport,
        clientTransport,
        (packet) => {
          if (packet.message.type === 'input') hostAdapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
        },
        (packet) => {
          if (packet.message.type === 'snapshot') clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
          if (packet.message.type === 'event') clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
        }
      );

      for (let turn = 0; turn < 60; turn += 1) {
        const wedge = 20 - (turn % 7);
        hostAdapter.onInput({ wedge, multiplier: 2, playerIndex: 0 });
        const hostEvents = hostAdapter.step();
        for (const event of hostEvents) sendEventFromHost(hostTransport, event);
        sendSnapshotFromHost(hostTransport, turn * 2, hostAdapter.getSnapshot());

        sendInputToHost(clientTransport, turn, { wedge: Math.max(1, wedge - 2), multiplier: 1, playerIndex: 1 });
        const clientTurnEvents = hostAdapter.step();
        for (const event of clientTurnEvents) sendEventFromHost(hostTransport, event);
        sendSnapshotFromHost(hostTransport, turn * 2 + 1, hostAdapter.getSnapshot());

        if (hostAdapter.getResult()) break;
      }

      expect(clientAdapter.getSnapshot().score).toEqual(hostAdapter.getSnapshot().score);
      expect(clientAdapter.getSnapshot().turn).toBe(hostAdapter.getSnapshot().turn);
    }
  });
});
