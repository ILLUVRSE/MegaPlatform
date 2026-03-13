import { describe, expect, it } from 'vitest';
import { loadMinigolfCourse } from '../games/minigolf/levels';
import { simulateShotForServer } from '../games/minigolf/serverSim';
import { HostAuthorityController } from './adapterMultiplayerScene';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';
import { createProtocolMessage } from './protocol';
import { MockLoopbackTransport } from './transport';

const course = loadMinigolfCourse();

function makeHonestShot(holeIndex: number, power: number, angle: number) {
  const summary = simulateShotForServer(course.holes[holeIndex], { power, angle });
  return { power, angle, endX: summary.finalX, endY: summary.finalY };
}

function createClientHarness(heartbeatTimeoutMs = 8000) {
  const host = new MinigolfMultiplayerAdapter();
  const client = new MinigolfMultiplayerAdapter();
  host.init({ role: 'host', playerId: 'host', seed: 2026, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'turn-order' } });
  client.init({ role: 'client', playerId: 'client', seed: 2026, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'turn-order' } });
  host.start();
  client.start();

  const controller = new HostAuthorityController('client', 'host', heartbeatTimeoutMs);
  const hostTransport = new MockLoopbackTransport('host', 'host');
  const clientTransport = new MockLoopbackTransport('client', 'host');
  const ghostTransport = new MockLoopbackTransport('ghost', 'host');
  hostTransport.connectPeer(clientTransport);
  ghostTransport.connectPeer(clientTransport);

  const reconciles: unknown[] = [];

  clientTransport.onMessage((packet) => {
    const nowMs = Number(packet.message.ts);
    if (packet.message.type === 'snapshot') {
      const decision = controller.noteHostHeartbeat(packet.fromPlayerId, nowMs);
      if (!decision.accepted) {
        reconciles.push(client.reconcileHostAuthority({ peerId: packet.fromPlayerId, reason: decision.reason, snapshotTick: packet.message.tick }));
        return;
      }
      client.applySnapshot(packet.message.state as ReturnType<typeof host.getSnapshot>);
      return;
    }
    if (packet.message.type === 'event') {
      const decision = controller.noteHostHeartbeat(packet.fromPlayerId, nowMs);
      if (!decision.accepted) {
        reconciles.push(client.reconcileHostAuthority({ peerId: packet.fromPlayerId, reason: decision.reason }));
        return;
      }
      client.applyEvent(packet.message.event as Parameters<typeof client.applyEvent>[0]);
    }
  });

  controller.noteSignalingHost('host', 0);
  controller.notePeerState([{ peerId: 'host', connected: true }], 0);

  return { host, client, controller, hostTransport, clientTransport, ghostTransport, reconciles };
}

describe('minigolf hosting hardening', () => {
  it('accepts normal host snapshots and events from the authorized host', () => {
    const rig = createClientHarness();
    const shot = makeHonestShot(0, 0.42, -0.08);

    rig.host.onInput({ ...shot, playerIndex: 0, expectedTurn: 0 });
    const events = rig.host.step();
    for (const event of events) {
      rig.hostTransport.broadcastFromHost(createProtocolMessage('event', { event }));
    }
    rig.hostTransport.broadcastFromHost(createProtocolMessage('snapshot', { tick: 1, state: rig.host.getSnapshot() }));

    expect(rig.client.getSnapshot().checksum).toBe(rig.host.getSnapshot().checksum);
    expect(rig.reconciles).toHaveLength(0);
  });

  it('rejects ghost-host events and records a reconciliation resync', () => {
    const rig = createClientHarness();
    const before = rig.client.getSnapshot();
    const ghostEvent = {
      type: 'stroke_result' as const,
      eventId: 44,
      player: 0 as const,
      hole: 2,
      nextPlayer: 1 as const,
      finalBall: { p0: { x: 999, y: 999 }, p1: { x: 0, y: 0 } },
      strokes: { p0: 2, p1: 0 },
      penalties: { p0: 0, p1: 0 },
      totals: { p0: 2, p1: 0 },
      checksum: 1234
    };

    rig.ghostTransport.broadcastFromHost(createProtocolMessage('event', { event: ghostEvent }));

    expect(rig.reconciles).toHaveLength(1);
    expect(rig.client.getSnapshot()).toEqual(before);
    expect(rig.controller.isWaitingForHost()).toBe(true);
  });

  it('marks the host stale after the heartbeat timeout and ignores new authoritative packets until signaling reaffirms host', () => {
    const rig = createClientHarness(8000);
    rig.controller.noteHostHeartbeat('host', 1000);
    expect(rig.controller.update(9001)).toBe('heartbeat-timeout:host');
    const staleDecision = rig.controller.noteHostHeartbeat('host', 9002);
    expect(staleDecision.accepted).toBe(false);

    const shot = makeHonestShot(0, 0.42, -0.08);
    rig.host.onInput({ ...shot, playerIndex: 0, expectedTurn: 0 });
    rig.host.step();
    rig.hostTransport.broadcastFromHost(createProtocolMessage('snapshot', { tick: 2, state: rig.host.getSnapshot() }));
    expect(rig.reconciles.length).toBeGreaterThan(0);

    rig.clientTransport.simulateRoomJoined('host');
    rig.controller.noteSignalingHost('host', 9003);
    rig.clientTransport.simulatePeerState([{ peerId: 'host', connected: true }]);
    rig.controller.notePeerState([{ peerId: 'host', connected: true }], 9003);
    const accepted = rig.controller.noteHostHeartbeat('host', 9004);
    expect(accepted.accepted).toBe(true);
  });

  it('forbids ghost host takeover attempts without signaling authorization', () => {
    const rig = createClientHarness();
    rig.clientTransport.simulatePeerState([{ peerId: 'ghost', connected: true }]);
    const mismatch = rig.controller.notePeerState([{ peerId: 'ghost', connected: true }], 100);

    expect(mismatch).toBe('ghost-peer:ghost');
    const ghostDecision = rig.controller.noteHostHeartbeat('ghost', 101);
    expect(ghostDecision.accepted).toBe(false);
    expect(rig.controller.getHostPlayerId()).toBe('host');
  });
});
