import { describe, expect, it } from 'vitest';
import { PoolMultiplayerAdapter } from './adapters/pool';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('pool multiplayer integration', () => {
  it('syncs shot outcomes, fouls, and turn changes', () => {
    const started = createStartedRoom('POOL', 3037);
    const hostAdapter = new PoolMultiplayerAdapter();
    const clientAdapter = new PoolMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: '8-ball' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: '8-ball' } });
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

    for (let turn = 0; turn < 30; turn += 1) {
      hostAdapter.onInput({ cueAngle: 0.35, cuePower: 0.8, calledPocket: 2, playerIndex: 0 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2, hostAdapter.getSnapshot());

      sendInputToHost(clientTransport, turn, { cueAngle: -0.6, cuePower: 0.72, calledPocket: 4, playerIndex: 1 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, turn * 2 + 1, hostAdapter.getSnapshot());

      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().turn).toBe(hostAdapter.getSnapshot().turn);
    expect(clientAdapter.getSnapshot().pocketed).toEqual(hostAdapter.getSnapshot().pocketed);
  });
});
