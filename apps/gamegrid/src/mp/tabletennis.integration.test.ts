import { describe, expect, it } from 'vitest';
import { TableTennisMultiplayerAdapter } from './adapters/table-tennis';
import { createProtocolMessage } from './protocol';
import { RoomStateMachine } from './room';
import { MockLoopbackTransport } from './transport';

describe('table-tennis multiplayer integration', () => {
  it('starts, syncs snapshots, and keeps score consistent', () => {
    const room = new RoomStateMachine('host', 'Host', 'TENN', 2026);
    room.joinPlayer('client', 'Client');
    room.setReady('host', true);
    room.setReady('client', true);
    const started = room.start('host');

    const hostAdapter = new TableTennisMultiplayerAdapter();
    const clientAdapter = new TableTennisMultiplayerAdapter();

    hostAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: started.seed,
      options: {
        hostPlayerId: 'host',
        playerIndex: 0,
        playerIds: ['host', 'client'],
        mode: 'quick_match'
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
        mode: 'quick_match'
      }
    });

    hostAdapter.start();
    clientAdapter.start();

    const hostTransport = new MockLoopbackTransport('host');
    const clientTransport = new MockLoopbackTransport('client');
    hostTransport.connectPeer(clientTransport);
    clientTransport.connectPeer(hostTransport);

    hostTransport.onMessage((packet) => {
      if (packet.message.type === 'input') {
        hostAdapter.onRemoteMessage({
          fromPlayerId: packet.fromPlayerId,
          input: packet.message.input
        });
      }
    });

    clientTransport.onMessage((packet) => {
      if (packet.message.type === 'snapshot') {
        clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
      }
      if (packet.message.type === 'event') {
        clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
      }
    });

    expect(() => {
      for (let tick = 0; tick < 900; tick += 1) {
        const phase = tick / 900;
        const bottomX = Math.sin(phase * Math.PI * 3) * 140;
        const topX = Math.cos(phase * Math.PI * 4) * 140;

        hostAdapter.onInput({ targetX: bottomX, velX: Math.cos(phase * Math.PI * 3) * 420, playerIndex: 0, seq: tick });

        clientTransport.sendToHost(
          createProtocolMessage('input', {
            playerId: 'client',
            input: { targetX: topX, velX: -Math.sin(phase * Math.PI * 4) * 420, playerIndex: 1, seq: tick },
            seq: tick
          })
        );

        const events = hostAdapter.step(1 / 120);

        if (tick % 6 === 0) {
          hostTransport.broadcastFromHost(
            createProtocolMessage('snapshot', {
              tick,
              state: hostAdapter.getSnapshot()
            })
          );
        }

        for (let i = 0; i < events.length; i += 1) {
          hostTransport.broadcastFromHost(createProtocolMessage('event', { event: events[i] }));
        }
      }
    }).not.toThrow();

    const hostSnapshot = hostAdapter.getSnapshot();
    const clientSnapshot = clientAdapter.getSnapshot();

    expect(clientSnapshot.score).toEqual(hostSnapshot.score);
    expect(clientSnapshot.match.phase).toBe(hostSnapshot.match.phase);
    expect(clientSnapshot.tick).toBeGreaterThan(0);
  });
});
