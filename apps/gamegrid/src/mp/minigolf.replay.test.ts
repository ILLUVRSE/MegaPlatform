import { describe, expect, it } from 'vitest';
import { simulateShotForServer } from '../games/minigolf/serverSim';
import type { MinigolfCourse } from '../games/minigolf/types';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';
import { minigolfReplayFixtureCourse } from '../../test/fixtures/minigolf/customHoles';
import { minigolfReplayFixtureShots, type MinigolfReplayFixtureShot } from '../../test/fixtures/minigolf/replayShots';

type ShotEvent = ReturnType<MinigolfMultiplayerAdapter['step']>[number];

function installFixtureCourse(adapter: MinigolfMultiplayerAdapter, course: MinigolfCourse) {
  (adapter as unknown as { course: MinigolfCourse }).course = course;
}

function createRig(course: MinigolfCourse) {
  const host = new MinigolfMultiplayerAdapter();
  const client0 = new MinigolfMultiplayerAdapter();
  const client1 = new MinigolfMultiplayerAdapter();
  installFixtureCourse(host, course);
  installFixtureCourse(client0, course);
  installFixtureCourse(client1, course);

  const baseOptions = { hostPlayerId: 'host', playerIds: ['host', 'client'] as [string, string], mode: 'turn-order' as const };
  host.init({ role: 'host', playerId: 'host', seed: 3034, options: { ...baseOptions, playerIndex: 0 } });
  client0.init({ role: 'client', playerId: 'host', seed: 3034, options: { ...baseOptions, playerIndex: 0 } });
  client1.init({ role: 'client', playerId: 'client', seed: 3034, options: { ...baseOptions, playerIndex: 1 } });
  host.start();
  client0.start();
  client1.start();
  return { host, client0, client1 };
}

function syncClients(clients: MinigolfMultiplayerAdapter[], snapshot: ReturnType<MinigolfMultiplayerAdapter['getSnapshot']>) {
  for (const client of clients) {
    client.applySnapshot(snapshot);
  }
}

function setHole(adapters: MinigolfMultiplayerAdapter[], course: MinigolfCourse, holeNumber: number, turn: 0 | 1) {
  for (const adapter of adapters) {
    const snapshot = adapter.getSnapshot();
    adapter.applySnapshot({
      ...snapshot,
      hole: holeNumber,
      totalHoles: course.holes.length,
      turn,
      strokes: { p0: 0, p1: 0 },
      penalties: { p0: 0, p1: 0 },
      ballEnd: {
        p0: { ...course.holes[holeNumber - 1].start },
        p1: { ...course.holes[holeNumber - 1].start }
      }
    });
  }
}

function submitShot(host: MinigolfMultiplayerAdapter, shot: MinigolfReplayFixtureShot) {
  if (shot.playerIndex === 0) {
    host.onInput({
      power: shot.power,
      angle: shot.angle,
      endX: shot.declaredEnd.x,
      endY: shot.declaredEnd.y,
      playerIndex: 0,
      expectedTurn: shot.expectedTurn
    });
  } else {
    host.onRemoteMessage({
      fromPlayerId: 'client',
      input: {
        type: 'shot',
        power: shot.power,
        angle: shot.angle,
        endX: shot.declaredEnd.x,
        endY: shot.declaredEnd.y,
        playerIndex: 1,
        expectedTurn: shot.expectedTurn
      }
    });
  }
  return host.step();
}

function replaySequence(course: MinigolfCourse, shots: MinigolfReplayFixtureShot[]) {
  const { host, client0, client1 } = createRig(course);
  const eventsByShot: ShotEvent[][] = [];
  setHole([host, client0, client1], course, shots[0]?.holeNumber ?? 1, shots[0]?.expectedTurn ?? 0);

  for (const shot of shots) {
    if (host.getSnapshot().hole !== shot.holeNumber || host.getSnapshot().turn !== shot.expectedTurn) {
      setHole([host, client0, client1], course, shot.holeNumber, shot.expectedTurn);
    }
    const events = submitShot(host, shot);
    eventsByShot.push(events);
    syncClients([client0, client1], host.getSnapshot());
    for (const event of events) {
      client0.applyEvent(event);
      client1.applyEvent(event);
    }
  }

  return { host, client0, client1, eventsByShot };
}

describe('minigolf deterministic replay', () => {
  it('replays fixture shots against deterministic server endpoints within tolerance', () => {
    for (const shot of minigolfReplayFixtureShots) {
      const hole = minigolfReplayFixtureCourse.holes[shot.holeNumber - 1];
      const summary = simulateShotForServer(hole, { power: shot.power, angle: shot.angle });

      expect(summary.reason).toBe(shot.expect.reason);
      expect(summary.hitWall).toBe(Boolean(shot.expect.hitWall));
      expect(summary.hitSand).toBe(Boolean(shot.expect.hitSand));
      expect(summary.enteredWater).toBe(Boolean(shot.expect.enteredWater));

      const delta = Math.hypot(summary.finalX - shot.declaredEnd.x, summary.finalY - shot.declaredEnd.y);
      expect(delta, shot.name).toBeLessThanOrEqual(shot.tolerance);
    }
  });

  it('emits state_resync when a client declared end position drifts outside tolerance', () => {
    const baseline = minigolfReplayFixtureShots.find((shot) => shot.name === 'bumper-bounce-client');
    expect(baseline).toBeTruthy();
    if (!baseline) {
      return;
    }

    const { host, client0, client1 } = createRig(minigolfReplayFixtureCourse);
    setHole([host, client0, client1], minigolfReplayFixtureCourse, baseline.holeNumber, baseline.expectedTurn);
    const events = submitShot(host, {
      ...baseline,
      declaredEnd: { x: baseline.declaredEnd.x + baseline.tolerance + 20, y: baseline.declaredEnd.y }
    });

    expect(events.some((event) => event.type === 'stroke_result')).toBe(false);
    expect(events.some((event) => event.type === 'state_resync')).toBe(true);
    expect(host.getSnapshot().checksum).toBe(client0.getSnapshot().checksum);
    expect(host.getSnapshot().checksum).toBe(client1.getSnapshot().checksum);
  });

  it('replays the same fixture sequence twice with identical stroke checksums', () => {
    const runA = replaySequence(minigolfReplayFixtureCourse, minigolfReplayFixtureShots);
    const runB = replaySequence(minigolfReplayFixtureCourse, minigolfReplayFixtureShots);
    const checksumsA = runA.eventsByShot.flat().filter((event) => event.type === 'stroke_result').map((event) => event.checksum);
    const checksumsB = runB.eventsByShot.flat().filter((event) => event.type === 'stroke_result').map((event) => event.checksum);

    expect(checksumsA).toEqual(checksumsB);
    expect(runA.host.getSnapshot().checksum).toBe(runB.host.getSnapshot().checksum);
    expect(runA.client0.getSnapshot().checksum).toBe(runA.host.getSnapshot().checksum);
    expect(runA.client1.getSnapshot().checksum).toBe(runA.host.getSnapshot().checksum);
  });
});
