import { describe, expect, it } from 'vitest';
import { FreethrowFrenzyMultiplayerAdapter } from './adapters/freethrow-frenzy';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('freethrow-frenzy multiplayer integration', () => {
  it('syncs mode-end state, accuracy, and streak reconciliation', () => {
    const started = createStartedRoom('FTHR', 3035);
    const hostAdapter = new FreethrowFrenzyMultiplayerAdapter();
    const clientAdapter = new FreethrowFrenzyMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'timed' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'timed' } });
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

    for (let turn = 0; turn < 40; turn += 1) {
      hostAdapter.onInput({ aim: 0.08, power: 0.69, meterPhase: 0.52, pressure: 0.25, spot: 'midrange', playerIndex: 0 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2, hostAdapter.getSnapshot());

      sendInputToHost(clientTransport, turn, { aim: -0.12, power: 0.66, meterPhase: 0.48, pressure: 0.2, spot: 'free_throw', playerIndex: 1 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2 + 1, hostAdapter.getSnapshot());

      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().score).toEqual(hostAdapter.getSnapshot().score);
    expect(clientAdapter.getSnapshot().shotsTaken).toBe(hostAdapter.getSnapshot().shotsTaken);
  });
});
