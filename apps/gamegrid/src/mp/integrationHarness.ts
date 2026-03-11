import { createProtocolMessage } from './protocol';
import { RoomStateMachine } from './room';
import { MockLoopbackTransport } from './transport';

export function createStartedRoom(code: string, seed = 2026) {
  const room = new RoomStateMachine('host', 'Host', code, seed);
  room.joinPlayer('client', 'Client');
  room.setReady('host', true);
  room.setReady('client', true);
  return room.start('host');
}

export function wireLoopback(
  hostTransport: MockLoopbackTransport,
  clientTransport: MockLoopbackTransport,
  onHostMessage: (packet: { fromPlayerId: string; message: any }) => void,
  onClientMessage: (packet: { fromPlayerId: string; message: any }) => void
) {
  hostTransport.connectPeer(clientTransport);
  clientTransport.connectPeer(hostTransport);
  hostTransport.onMessage(onHostMessage);
  clientTransport.onMessage(onClientMessage);
}

export function sendInputToHost(clientTransport: MockLoopbackTransport, seq: number, input: unknown) {
  clientTransport.sendToHost(
    createProtocolMessage('input', {
      playerId: 'client',
      input,
      seq
    })
  );
}

export function sendSnapshotFromHost(hostTransport: MockLoopbackTransport, tick: number, state: unknown) {
  hostTransport.broadcastFromHost(
    createProtocolMessage('snapshot', {
      tick,
      state
    })
  );
}

export function sendEventFromHost(hostTransport: MockLoopbackTransport, event: unknown) {
  hostTransport.broadcastFromHost(
    createProtocolMessage('event', {
      event
    })
  );
}
