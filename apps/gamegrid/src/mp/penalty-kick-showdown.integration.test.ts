import { describe, expect, it } from 'vitest';
import { PenaltyKickShowdownMultiplayerAdapter } from './adapters/penalty-kick-showdown';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('penalty-kick-showdown multiplayer integration', () => {
  it('syncs aim/timing and classic/ladder shot results', () => {
    const started = createStartedRoom('PKSD', 3032);
    const hostAdapter = new PenaltyKickShowdownMultiplayerAdapter();
    const clientAdapter = new PenaltyKickShowdownMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'ladder' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'ladder' } });
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

    for (let tick = 0; tick < 2000; tick += 1) {
      const phase = tick / 2000;
      hostAdapter.onInput({ aimX: Math.sin(phase * 8) * 180, timing: (Math.sin(phase * 6) + 1) / 2, keeperX: 0, playerIndex: 0 });
      sendInputToHost(clientTransport, tick, { aimX: 0, timing: 0.5, keeperX: Math.cos(phase * 9) * 180, playerIndex: 1 });
      const events = hostAdapter.step(1 / 120);
      if (tick % 6 === 0) sendSnapshotFromHost(hostTransport, tick, hostAdapter.getSnapshot());
      for (const event of events) sendEventFromHost(hostTransport, event);
      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().rounds.played).toBe(hostAdapter.getSnapshot().rounds.played);
    expect(clientAdapter.getSnapshot().score).toEqual(hostAdapter.getSnapshot().score);
  });
});
