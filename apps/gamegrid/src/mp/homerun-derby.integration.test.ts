import { describe, expect, it } from 'vitest';
import { HomerunDerbyMultiplayerAdapter } from './adapters/homerun-derby';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('homerun-derby multiplayer integration', () => {
  it('syncs pitch/swing outcomes and tally rules', () => {
    const started = createStartedRoom('HMRN', 3036);
    const hostAdapter = new HomerunDerbyMultiplayerAdapter();
    const clientAdapter = new HomerunDerbyMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'power' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'power' } });
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

    for (let turn = 0; turn < 26; turn += 1) {
      hostAdapter.onInput({ swingTiming: 0.52, swingPower: 0.84, playerIndex: 0 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2, hostAdapter.getSnapshot());

      sendInputToHost(clientTransport, turn, { swingTiming: 0.47, swingPower: 0.8, playerIndex: 1 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2 + 1, hostAdapter.getSnapshot());

      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().score).toEqual(hostAdapter.getSnapshot().score);
    expect(clientAdapter.getSnapshot().pitchesTaken).toBe(hostAdapter.getSnapshot().pitchesTaken);
  });
});
