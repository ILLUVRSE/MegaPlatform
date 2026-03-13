import { describe, expect, it } from 'vitest';
import { loadMinigolfCourse } from '../games/minigolf/levels';
import { simulateShotForServer } from '../games/minigolf/serverSim';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';

const course = loadMinigolfCourse();

function makeHonestShot(holeIndex: number, power: number, angle: number) {
  const hole = course.holes[holeIndex];
  const summary = simulateShotForServer(hole, { power, angle });
  return {
    power,
    angle,
    endX: summary.finalX,
    endY: summary.finalY
  };
}

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

    const hostShot = makeHonestShot(0, 0.42, -0.08);
    hostAdapter.onInput({ ...hostShot, playerIndex: 0, expectedTurn: 0 });
    const hostEvents = hostAdapter.step();
    expect(hostEvents.some((event) => event.type === 'stroke_result')).toBe(true);
    for (const event of hostEvents) sendEventFromHost(hostTransport, event);
    sendSnapshotFromHost(hostTransport, 0, hostAdapter.getSnapshot());

    const clientShot = makeHonestShot(0, 0.39, -0.04);
    sendInputToHost(clientTransport, 1, { ...clientShot, playerIndex: 1, expectedTurn: 1 });
    const clientEvents = hostAdapter.step();
    expect(clientEvents.some((event) => event.type === 'stroke_result')).toBe(true);
    for (const event of clientEvents) sendEventFromHost(hostTransport, event);
    sendSnapshotFromHost(hostTransport, 1, hostAdapter.getSnapshot());

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
