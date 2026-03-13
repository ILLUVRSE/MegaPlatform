import { describe, expect, it } from 'vitest';
import { loadMinigolfCourse } from '../games/minigolf/levels';
import { simulateShotForServer } from '../games/minigolf/serverSim';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';
import { PixelPuckMultiplayerAdapter } from './adapters/pixelpuckAdapter';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { createSpectatorAdapter, usesMinimalSpectatorBandwidth } from './spectator';
import { MockLoopbackTransport } from './transport';

const minigolfCourse = loadMinigolfCourse();

function makeHonestShot(holeIndex: number, power: number, angle: number) {
  const hole = minigolfCourse.holes[holeIndex];
  const summary = simulateShotForServer(hole, { power, angle });
  return {
    power,
    angle,
    endX: summary.finalX,
    endY: summary.finalY
  };
}

describe('spectator multiplayer integration', () => {
  it('allows a spectator to join PixelPuck mid-match and catch up via read-only snapshots', () => {
    const started = createStartedRoom('SPEC', 2026);
    const hostAdapter = new PixelPuckMultiplayerAdapter();
    const clientAdapter = new PixelPuckMultiplayerAdapter();
    const spectatorAdapter = new PixelPuckMultiplayerAdapter();

    hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host' } });
    clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host' } });
    spectatorAdapter.init({ role: 'client', playerId: 'spectator', seed: started.seed, options: { hostPlayerId: 'host' } });
    hostAdapter.start();
    clientAdapter.start();
    spectatorAdapter.start();

    const hostTransport = new MockLoopbackTransport('host');
    const clientTransport = new MockLoopbackTransport('client');
    wireLoopback(
      hostTransport,
      clientTransport,
      (packet) => {
        if (packet.message.type === 'input') {
          hostAdapter.onRemoteMessage(packet.message.input);
        }
      },
      (packet) => {
        if (packet.message.type === 'snapshot') {
          clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
        }
        if (packet.message.type === 'event') {
          clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
        }
      }
    );

    const hostSpectator = createSpectatorAdapter(hostAdapter);
    const spectatorClient = createSpectatorAdapter(spectatorAdapter);

    for (let tick = 0; tick < 420; tick += 1) {
      const phase = tick / 420;
      sendInputToHost(clientTransport, tick, {
        targetX: 640 + Math.sin(phase * Math.PI * 4) * 180,
        targetY: 190 + Math.cos(phase * Math.PI * 2) * 60
      });

      hostAdapter.onInput({ targetX: 640, targetY: 560, seq: tick });
      const events = hostAdapter.step(1 / 120);

      if (tick % 6 === 0) {
        sendSnapshotFromHost(hostTransport, tick, hostAdapter.getSnapshot());
        if (tick >= 180) {
          spectatorClient.applySnapshot(hostSpectator.createSnapshot());
        }
      }

      for (const event of events) {
        sendEventFromHost(hostTransport, event);
      }
    }

    const hostSnapshot = hostAdapter.getSnapshot();
    const spectatorSnapshot = spectatorAdapter.getSnapshot();

    expect(spectatorSnapshot.score).toEqual(hostSnapshot.score);
    expect(spectatorSnapshot.ended).toBe(hostSnapshot.ended);
    expect(hostSnapshot.tick - spectatorSnapshot.tick).toBeLessThanOrEqual(6);
  });

  it('exposes minimal-bandwidth spectator snapshots for PixelPuck', () => {
    const adapter = new PixelPuckMultiplayerAdapter();
    const spectator = new PixelPuckMultiplayerAdapter();
    adapter.init({ role: 'host', playerId: 'host', seed: 3030, options: { hostPlayerId: 'host' } });
    spectator.init({ role: 'client', playerId: 'spectator', seed: 3030, options: { hostPlayerId: 'host' } });
    adapter.start();
    spectator.start();

    for (let tick = 0; tick < 48; tick += 1) {
      adapter.onInput({ targetX: 640 + tick, targetY: 560 - tick, seq: tick });
      adapter.onRemoteMessage({ input: { targetX: 640 - tick, targetY: 200 + tick, seq: tick }, fromPlayerId: 'client' });
      adapter.step(1 / 120);
    }

    const hostSpectator = createSpectatorAdapter(adapter);
    const spectatorClient = createSpectatorAdapter(spectator);
    const payload = hostSpectator.createSnapshot({ bandwidthMode: 'minimal' });
    spectatorClient.applySnapshot(payload);

    const hostSnapshot = adapter.getSnapshot();
    const spectatorSnapshot = spectator.getSnapshot();

    expect(usesMinimalSpectatorBandwidth(payload)).toBe(true);
    expect(payload.snapshot.puck).not.toHaveProperty('vx');
    expect(payload.snapshot.paddles.bottom).not.toHaveProperty('vx');
    expect(spectatorSnapshot.score).toEqual(hostSnapshot.score);
    expect(spectatorSnapshot.puck.x).toBeCloseTo(hostSnapshot.puck.x, 5);
    expect(spectatorSnapshot.puck.vx).toBe(0);
  });

  it('includes optional ghost playback in Minigolf spectator snapshots', () => {
    const started = createStartedRoom('MGLF', 4040);
    const hostAdapter = new MinigolfMultiplayerAdapter();
    const clientAdapter = new MinigolfMultiplayerAdapter();
    const spectatorAdapter = new MinigolfMultiplayerAdapter();

    hostAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: started.seed,
      options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode: 'turn-order' }
    });
    clientAdapter.init({
      role: 'client',
      playerId: 'client',
      seed: started.seed,
      options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode: 'turn-order' }
    });
    spectatorAdapter.init({
      role: 'client',
      playerId: 'spectator',
      seed: started.seed,
      options: { hostPlayerId: 'host', playerIds: ['host', 'client'], mode: 'turn-order' }
    });
    hostAdapter.start();
    clientAdapter.start();
    spectatorAdapter.start();

    const hostTransport = new MockLoopbackTransport('host');
    const clientTransport = new MockLoopbackTransport('client');
    wireLoopback(
      hostTransport,
      clientTransport,
      (packet) => {
        if (packet.message.type === 'input') {
          hostAdapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
        }
      },
      (packet) => {
        if (packet.message.type === 'snapshot') {
          clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
        }
        if (packet.message.type === 'event') {
          clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
        }
      }
    );

    const openingShot = makeHonestShot(0, 0.42, -0.08);
    hostAdapter.onInput({ ...openingShot, playerIndex: 0, expectedTurn: 0 });
    for (const event of hostAdapter.step()) {
      sendEventFromHost(hostTransport, event);
    }
    sendSnapshotFromHost(hostTransport, 0, hostAdapter.getSnapshot());

    const replyShot = makeHonestShot(0, 0.39, -0.04);
    sendInputToHost(clientTransport, 1, { ...replyShot, playerIndex: 1, expectedTurn: 1 });
    for (const event of hostAdapter.step()) {
      sendEventFromHost(hostTransport, event);
    }
    sendSnapshotFromHost(hostTransport, 1, hostAdapter.getSnapshot());

    const hostSpectator = createSpectatorAdapter(hostAdapter);
    const spectatorClient = createSpectatorAdapter(spectatorAdapter);
    const payload = hostSpectator.createSnapshot({ includeGhostPlayback: true });
    spectatorClient.applySnapshot(payload);

    expect(payload.ghostPlayback).toBeTruthy();
    expect(payload.ghostPlayback?.hole).toBe(hostAdapter.getSnapshot().hole);
    expect(spectatorAdapter.getSnapshot().totals).toEqual(hostAdapter.getSnapshot().totals);
    expect(spectatorAdapter.getSnapshot().ballEnd).toEqual(hostAdapter.getSnapshot().ballEnd);
  });
});
