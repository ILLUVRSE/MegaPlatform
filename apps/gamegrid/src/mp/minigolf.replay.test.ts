import { describe, expect, it } from 'vitest';
import { loadMinigolfCourse } from '../games/minigolf/levels';
import { simulateShotForServer, type ServerShotSummary } from '../games/minigolf/serverSim';
import { MinigolfMultiplayerAdapter } from './adapters/minigolf';

const course = loadMinigolfCourse();

type ReplayShot = {
  holeNumber: number;
  playerIndex: 0 | 1;
  power: number;
  angle: number;
  expectedTurn: 0 | 1;
  declaredEnd: { x: number; y: number };
  summary: ServerShotSummary;
};

function createRig() {
  const host = new MinigolfMultiplayerAdapter();
  const client0 = new MinigolfMultiplayerAdapter();
  const client1 = new MinigolfMultiplayerAdapter();
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

function setHole(
  adapters: MinigolfMultiplayerAdapter[],
  holeNumber: number,
  turn: 0 | 1 = 0,
  ballEnd?: { x: number; y: number }
) {
  for (const adapter of adapters) {
    const snapshot = adapter.getSnapshot();
    adapter.applySnapshot({
      ...snapshot,
      hole: holeNumber,
      turn,
      strokes: { p0: 0, p1: 0 },
      penalties: { p0: 0, p1: 0 },
      ballEnd: {
        p0: ballEnd ? { ...ballEnd } : { x: 0, y: 0 },
        p1: ballEnd ? { ...ballEnd } : { x: 0, y: 0 }
      }
    });
  }
}

function submitShot(host: MinigolfMultiplayerAdapter, shot: ReplayShot) {
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

function buildHonestShot(
  holeNumber: number,
  playerIndex: 0 | 1,
  expectedTurn: 0 | 1,
  predicate: (summary: ServerShotSummary) => boolean
): ReplayShot {
  const hole = course.holes[holeNumber - 1];
  const baseAngle = Math.atan2(hole.cup.y - hole.start.y, hole.cup.x - hole.start.x);
  const angleOffsets = [-1.1, -0.8, -0.5, -0.25, -0.12, -0.06, 0, 0.06, 0.12, 0.25, 0.5, 0.8, 1.1];
  const powers = [0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96];

  for (const power of powers) {
    for (const offset of angleOffsets) {
      const angle = baseAngle + offset;
      const summary = simulateShotForServer(hole, { power, angle });
      if (!summary.landed && summary.reason !== 'water') continue;
      if (!predicate(summary)) continue;
      return {
        holeNumber,
        playerIndex,
        power,
        angle,
        expectedTurn,
        declaredEnd: { x: summary.finalX, y: summary.finalY },
        summary
      };
    }
  }

  throw new Error(`Unable to find scripted shot for hole ${hole.id}`);
}

function replaySequence(shots: ReplayShot[]) {
  const { host, client0, client1 } = createRig();
  const eventsByShot: Array<ReturnType<MinigolfMultiplayerAdapter['step']>> = [];
  setHole([host, client0, client1], shots[0]?.holeNumber ?? 1, shots[0]?.expectedTurn ?? 0);
  for (const shot of shots) {
    if (host.getSnapshot().hole !== shot.holeNumber || host.getSnapshot().turn !== shot.expectedTurn) {
      setHole([host, client0, client1], shot.holeNumber, shot.expectedTurn);
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

function runSingleShot(shot: ReplayShot) {
  const { host, client0, client1 } = createRig();
  setHole([host, client0, client1], shot.holeNumber, shot.expectedTurn);
  const events = submitShot(host, shot);
  syncClients([client0, client1], host.getSnapshot());
  for (const event of events) {
    client0.applyEvent(event);
    client1.applyEvent(event);
  }
  return { host, client0, client1, events };
}

describe('minigolf deterministic replay', () => {
  it('accepts honest replay shots across collision-heavy holes and keeps checksums stable', () => {
    const scenarios = [
      buildHonestShot(1, 0, 0, (summary) => summary.hitSand),
      buildHonestShot(1, 1, 1, (summary) => summary.hitWall),
      buildHonestShot(2, 0, 0, (summary) => summary.enteredWater),
      buildHonestShot(4, 1, 1, (summary) => summary.hitWall)
    ];

    for (const shot of scenarios) {
      const { host, client0, client1, events } = runSingleShot(shot);
      const strokeEvent = events.find((event) => event.type === 'stroke_result');
      expect(strokeEvent).toBeTruthy();
      if (!strokeEvent || strokeEvent.type !== 'stroke_result') {
        continue;
      }
      const declared = shot.declaredEnd;
      const finalBall = strokeEvent.finalBall[shot.playerIndex === 0 ? 'p0' : 'p1'];
      expect(Math.hypot(finalBall.x - declared.x, finalBall.y - declared.y)).toBeLessThanOrEqual(8);
      expect(strokeEvent.checksum).toBe(host.getSnapshot().checksum);
      expect(client0.getSnapshot().checksum).toBe(host.getSnapshot().checksum);
      expect(client1.getSnapshot().checksum).toBe(host.getSnapshot().checksum);
    }
  });

  it('emits state_resync instead of stroke_result when a client declares an inconsistent end position', () => {
    const honest = buildHonestShot(1, 1, 1, (summary) => summary.hitWall);
    const { host, client0, client1 } = createRig();
    setHole([host, client0, client1], honest.holeNumber, 1);

    const events = submitShot(host, {
      ...honest,
      declaredEnd: { x: honest.declaredEnd.x + 24, y: honest.declaredEnd.y }
    });

    expect(events.some((event) => event.type === 'stroke_result')).toBe(false);
    expect(events.some((event) => event.type === 'state_resync')).toBe(true);
    expect(host.getSnapshot().checksum).toBe(client0.getSnapshot().checksum);
    expect(host.getSnapshot().checksum).toBe(client1.getSnapshot().checksum);
  });

  it('replays the same scripted sequence with identical stroke checksums across runs', () => {
    const shots = [
      buildHonestShot(1, 0, 0, (summary) => summary.hitSand),
      buildHonestShot(1, 1, 1, (summary) => summary.hitWall),
      buildHonestShot(2, 0, 0, (summary) => summary.enteredWater)
    ];

    const runA = replaySequence(shots);
    const runB = replaySequence(shots);
    const checksumsA = runA.eventsByShot.flat().filter((event) => event.type === 'stroke_result').map((event) => event.checksum);
    const checksumsB = runB.eventsByShot.flat().filter((event) => event.type === 'stroke_result').map((event) => event.checksum);

    expect(checksumsA).toEqual(checksumsB);
    expect(runA.host.getSnapshot().checksum).toBe(runB.host.getSnapshot().checksum);
  });
});
