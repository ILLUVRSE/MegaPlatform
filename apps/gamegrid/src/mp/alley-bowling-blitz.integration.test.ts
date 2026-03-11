import { describe, expect, it } from 'vitest';
import { AlleyBowlingBlitzMultiplayerAdapter } from './adapters/alley-bowling-blitz';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('alley-bowling-blitz multiplayer integration', () => {
  it('syncs frame scorecards and challenge progression', () => {
    const started = createStartedRoom('BOWL', 3038);
    const hostAdapter = new AlleyBowlingBlitzMultiplayerAdapter();
    const clientAdapter = new AlleyBowlingBlitzMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'challenge' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'challenge' } });
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
      hostAdapter.onInput({ power: 0.8, hook: 0.1, playerIndex: 0 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2, hostAdapter.getSnapshot());

      sendInputToHost(clientTransport, turn, { power: 0.74, hook: -0.12, playerIndex: 1 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2 + 1, hostAdapter.getSnapshot());

      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().totals).toEqual(hostAdapter.getSnapshot().totals);
    expect(clientAdapter.getSnapshot().frame).toBe(hostAdapter.getSnapshot().frame);
  });
});
