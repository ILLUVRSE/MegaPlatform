import { describe, expect, it } from 'vitest';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

describe('minigolf multiplayer integration', () => {
  it('syncs hole progression and canonical score state', () => {
    const started = createStartedRoom('MGLF', 3034);
    const hostAdapter = new MinigolfMultiplayerAdapter();
    const clientAdapter = new MinigolfMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'turn-order' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'turn-order' } });
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

    for (let step = 0; step < 24; step += 1) {
      const power = ((step % 5) + 3) / 10;
      hostAdapter.onInput({ power, angle: 0.1 * step, endX: step * 8, endY: step * 3, playerIndex: 0, expectedTurn: 0 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, step * 2, hostAdapter.getSnapshot());

      sendInputToHost(clientTransport, step, { power: power - 0.1, angle: -0.07 * step, endX: -step * 7, endY: step * 2, playerIndex: 1, expectedTurn: 1 });
      for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
      sendSnapshotFromHost(hostTransport, step * 2 + 1, hostAdapter.getSnapshot());

      if (hostAdapter.getResult()) break;
    }

    expect(clientAdapter.getSnapshot().hole).toBe(hostAdapter.getSnapshot().hole);
    expect(clientAdapter.getSnapshot().totals).toEqual(hostAdapter.getSnapshot().totals);
    expect(clientAdapter.getSnapshot().checksum).toBe(hostAdapter.getSnapshot().checksum);
  });

  it('enforces turn order and rejects non-current player stroke', () => {
    const adapter = new MinigolfMultiplayerAdapter();
    adapter.init({ role: 'host', playerId: 'host', seed: 1, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'turn-order' } });
    adapter.start();

    adapter.onRemoteMessage({ fromPlayerId: 'client', input: { type: 'shot', power: 0.8, angle: 0, endX: 12, endY: 6, expectedTurn: 1 } });
    const events = adapter.step();

    expect(events.some((event) => event.type === 'stroke_result')).toBe(false);
    expect(adapter.getSnapshot().turn).toBe(0);
  });

  it('host sends state_resync when checksum mismatch is reported', () => {
    const adapter = new MinigolfMultiplayerAdapter();
    adapter.init({ role: 'host', playerId: 'host', seed: 1, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'turn-order' } });
    adapter.start();

    adapter.onRemoteMessage({ fromPlayerId: 'client', input: { type: 'checksum_mismatch', checksum: 123456 } });
    const events = adapter.step();

    expect(events.some((event) => event.type === 'state_resync')).toBe(true);
  });
});
