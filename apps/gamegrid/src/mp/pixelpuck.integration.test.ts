import { describe, expect, it } from 'vitest';
import { PixelPuckMultiplayerAdapter } from './adapters/pixelpuckAdapter';
import { createProtocolMessage } from './protocol';
import { RoomStateMachine } from './room';
import { MockLoopbackTransport } from './transport';

describe('pixelpuck multiplayer integration', () => {
  it('starts room and syncs snapshots between host and client', () => {
    const room = new RoomStateMachine('host', 'Host', 'TEST', 2026);
    room.joinPlayer('client', 'Client');
    room.setReady('host', true);
    room.setReady('client', true);
    const started = room.start('host');

    const hostAdapter = new PixelPuckMultiplayerAdapter();
    const clientAdapter = new PixelPuckMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host' } });

    hostAdapter.start();
    clientAdapter.start();

    const hostTransport = new MockLoopbackTransport('host');
    const clientTransport = new MockLoopbackTransport('client');
    hostTransport.connectPeer(clientTransport);
    clientTransport.connectPeer(hostTransport);

    hostTransport.onMessage((packet) => {
      if (packet.message.type === 'input') {
        hostAdapter.onRemoteMessage(packet.message.input);
      }
    });

    clientTransport.onMessage((packet) => {
      if (packet.message.type === 'snapshot') {
        clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
      }
      if (packet.message.type === 'event') {
        clientAdapter.applyEvent(packet.message.event as { type: 'goal' | 'match_end' | 'rematch' });
      }
    });

    for (let tick = 0; tick < 420; tick += 1) {
      const phase = tick / 420;
      const inputX = 640 + Math.sin(phase * Math.PI * 4) * 180;
      const inputY = 190 + Math.cos(phase * Math.PI * 2) * 60;
      clientTransport.sendToHost(
        createProtocolMessage('input', {
          playerId: 'client',
          input: { targetX: inputX, targetY: inputY },
          seq: tick
        })
      );

      hostAdapter.onInput({ targetX: 640, targetY: 560 });
      const events = hostAdapter.step(1 / 120);

      if (tick % 6 === 0) {
        hostTransport.broadcastFromHost(
          createProtocolMessage('snapshot', {
            tick,
            state: hostAdapter.getSnapshot()
          })
        );
      }

      for (const event of events) {
        hostTransport.broadcastFromHost(createProtocolMessage('event', { event }));
      }
    }

    const hostSnapshot = hostAdapter.getSnapshot();
    const clientSnapshot = clientAdapter.getSnapshot();

    expect(clientSnapshot.score).toEqual(hostSnapshot.score);
    expect(clientSnapshot.ended).toBe(hostSnapshot.ended);
    expect(hostSnapshot.tick - clientSnapshot.tick).toBeLessThanOrEqual(6);
  });
});
