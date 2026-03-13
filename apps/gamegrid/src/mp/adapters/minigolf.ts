import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import { loadMinigolfCourse } from '../../games/minigolf/levels';
import { simulateShotForServer } from '../../games/minigolf/serverSim';
import {
  clamp,
  normalizePlayers,
  readInputEnvelope,
  readNumber,
  resolveSlotByPlayerId,
  safePlayerIndex,
  validateRemoteFromKnownPlayer,
  type PlayerIndex
} from './common';

type MinigolfMode = 'turn-order' | 'async';

const SERVER_VALIDATE_TOLERANCE = 8;

type MinigolfInput =
  | {
      type?: 'shot';
      playerIndex?: number;
      power: number;
      angle: number;
      endX: number;
      endY: number;
      declaredStrokes?: number;
      declaredPenalty?: number;
      expectedTurn?: PlayerIndex;
    }
  | {
      type: 'checksum_mismatch';
      checksum: number;
      playerIndex?: number;
    };

interface MinigolfSnapshot {
  mode: MinigolfMode;
  phase: 'live' | 'end';
  hole: number;
  totalHoles: number;
  turn: PlayerIndex;
  strokes: { p0: number; p1: number };
  penalties: { p0: number; p1: number };
  totals: { p0: number; p1: number };
  ballEnd: { p0: { x: number; y: number }; p1: { x: number; y: number } };
  ghostReplay: 'optional';
  checksum: number;
  lastEventId: number;
}

type MinigolfEvent =
  | {
      type: 'stroke_result';
      eventId: number;
      player: PlayerIndex;
      hole: number;
      nextPlayer: PlayerIndex;
      finalBall: { p0: { x: number; y: number }; p1: { x: number; y: number } };
      strokes: { p0: number; p1: number };
      penalties: { p0: number; p1: number };
      totals: { p0: number; p1: number };
      checksum: number;
    }
  | {
      type: 'state_checksum';
      eventId: number;
      checksum: number;
      hole: number;
    }
  | {
      type: 'state_resync';
      eventId: number;
      snapshot: MinigolfSnapshot;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; totals: { p0: number; p1: number } };

interface MinigolfResult {
  winner: 'p0' | 'p1' | 'none';
  totals: string;
  mode: MinigolfMode;
}

function toMode(value: unknown): MinigolfMode {
  return value === 'async' ? 'async' : 'turn-order';
}

function toShotPayload(input: MinigolfInput | null): Extract<MinigolfInput, { type?: 'shot' }> | null {
  if (!input) return null;
  if (input.type === 'checksum_mismatch') return null;
  return input;
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export class MinigolfMultiplayerAdapter implements MpAdapter<MinigolfInput, MinigolfSnapshot, MinigolfEvent, MinigolfResult> {
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private hostPlayerId = '';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;

  private mode: MinigolfMode = 'turn-order';
  private phase: 'live' | 'end' = 'live';
  private hole = 1;
  private totalHoles = 18;
  private turn: PlayerIndex = 0;

  private strokes = new Uint16Array(2);
  private penalties = new Uint16Array(2);
  private totals = new Uint16Array(2);
  private ballEnd = [
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];
  private holePlayed = [false, false];

  private lastEventId = 0;
  private result: MinigolfResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: MinigolfInput }> = [];
  private outEvents: MinigolfEvent[] = [];
  private forceResync = false;
  private queuedResync = false;
  private checksumEverySteps = 8;
  private stepCounter = 0;
  private readonly course = loadMinigolfCourse();

  init(context: MpAdapterInitContext): void {
    const players = normalizePlayers(context);
    this.role = context.role === 'host' && context.playerId === players.hostPlayerId ? 'host' : 'client';
    this.hostPlayerId = players.hostPlayerId;
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.mode = toMode(context.options?.mode);
    if (context.role === 'host' && this.role !== 'host') {
      this.debugAdmin('HOST_AUTH_RECONCILE', {
        peerId: context.playerId,
        reason: 'ghost-host-init',
        snapshotTick: 0
      });
    }
    this.reset();
  }

  onInput(localInput: MinigolfInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const input = env.input as Record<string, unknown> & MinigolfInput;
    if (!validateRemoteFromKnownPlayer(this.playerIdsByIndex, env.fromPlayerId, this.hostPlayerId)) {
      this.reconcileHostAuthority({ peerId: env.fromPlayerId, reason: 'unknown-remote-input' });
      return;
    }

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex((input as { playerIndex?: number }).playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    if (input.type === 'checksum_mismatch') {
      const checksum = readNumber(input.checksum, Number.NaN);
      if (!Number.isFinite(checksum)) {
        this.reconcileHostAuthority({ peerId: env.fromPlayerId, reason: 'invalid-checksum-payload' });
        return;
      }
      if (Math.abs(checksum - this.computeChecksum()) > 0) {
        this.reconcileHostAuthority({ peerId: env.fromPlayerId, reason: 'checksum-mismatch' });
      }
      return;
    }

    const power = readNumber(input.power, Number.NaN);
    const angle = readNumber(input.angle, Number.NaN);
    const endX = readNumber(input.endX, Number.NaN);
    const endY = readNumber(input.endY, Number.NaN);
    const currentHole = this.course.holes[Math.max(0, Math.min(this.course.holes.length - 1, this.hole - 1))];
    if (!Number.isFinite(power) || !Number.isFinite(angle) || !Number.isFinite(endX) || !Number.isFinite(endY)) {
      this.reconcileHostAuthority({ peerId: env.fromPlayerId, reason: 'invalid-shot-payload' });
      return;
    }

    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        power: clamp(power, 0, 1),
        angle: clamp(angle, -Math.PI, Math.PI),
        endX: clamp(endX, currentHole.bounds.x, currentHole.bounds.x + currentHole.bounds.width),
        endY: clamp(endY, currentHole.bounds.y, currentHole.bounds.y + currentHole.bounds.height),
        expectedTurn: typeof input.expectedTurn === 'number' ? input.expectedTurn : undefined
      }
    });
  }

  getSnapshot(): MinigolfSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      hole: this.hole,
      totalHoles: this.totalHoles,
      turn: this.turn,
      strokes: { p0: this.strokes[0], p1: this.strokes[1] },
      penalties: { p0: this.penalties[0], p1: this.penalties[1] },
      totals: { p0: this.totals[0], p1: this.totals[1] },
      ballEnd: { p0: this.ballEnd[0], p1: this.ballEnd[1] },
      ghostReplay: 'optional',
      checksum: this.computeChecksum(),
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: MinigolfSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.hole = snapshot.hole;
    this.totalHoles = snapshot.totalHoles;
    this.turn = snapshot.turn;
    this.strokes[0] = snapshot.strokes.p0;
    this.strokes[1] = snapshot.strokes.p1;
    this.penalties[0] = snapshot.penalties.p0;
    this.penalties[1] = snapshot.penalties.p1;
    this.totals[0] = snapshot.totals.p0;
    this.totals[1] = snapshot.totals.p1;
    this.ballEnd[0] = { ...snapshot.ballEnd.p0 };
    this.ballEnd[1] = { ...snapshot.ballEnd.p1 };
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: MinigolfEvent): unknown {
    return event;
  }

  applyEvent(event: MinigolfEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'stroke_result') {
      this.turn = event.nextPlayer;
      this.hole = event.hole;
      this.strokes[0] = event.strokes.p0;
      this.strokes[1] = event.strokes.p1;
      this.penalties[0] = event.penalties.p0;
      this.penalties[1] = event.penalties.p1;
      this.totals[0] = event.totals.p0;
      this.totals[1] = event.totals.p1;
      this.ballEnd[0] = { ...event.finalBall.p0 };
      this.ballEnd[1] = { ...event.finalBall.p1 };
      return;
    }

    if (event.type === 'state_checksum') {
      if (event.checksum !== this.computeChecksum()) {
        this.reconcileHostAuthority({ peerId: this.hostPlayerId, reason: 'unexpected-event-stream' });
      }
      return;
    }

    if (event.type === 'state_resync') {
      this.applySnapshot(event.snapshot);
      this.forceResync = false;
      return;
    }

    this.phase = 'end';
    this.totals[0] = event.totals.p0;
    this.totals[1] = event.totals.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      totals: `${event.totals.p0}-${event.totals.p1}`,
      mode: this.mode
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): MinigolfEvent[] {
    this.outEvents = [];
    if (this.phase === 'end') return this.outEvents;

    if (this.role === 'client') {
      if (this.forceResync) {
        const slot = safePlayerIndex(this.localPlayerIndex);
        if (slot !== null) {
          this.pending.push({ player: slot, input: { type: 'checksum_mismatch', checksum: this.computeChecksum(), playerIndex: slot } });
        }
        this.forceResync = false;
      }
      return this.outEvents;
    }

    this.stepCounter += 1;

    if (this.forceResync) {
      this.flushQueuedResync();
      return this.outEvents;
    }

    const action = this.pending.shift();
    if (!action) {
      if (this.stepCounter % this.checksumEverySteps === 0) {
        this.lastEventId += 1;
        this.outEvents.push({ type: 'state_checksum', eventId: this.lastEventId, checksum: this.computeChecksum(), hole: this.hole });
      }
      return this.outEvents;
    }

    if (action.input.type === 'checksum_mismatch') {
      this.reconcileHostAuthority({ peerId: this.playerIdsByIndex[action.player], reason: 'checksum-mismatch' });
      return this.outEvents;
    }

    const shot = toShotPayload(action.input);
    if (!shot) return this.outEvents;

    if (this.mode === 'turn-order' && action.player !== this.turn) {
      this.reconcileHostAuthority({ peerId: this.playerIdsByIndex[action.player], reason: 'turn-order-violation' });
      return this.outEvents;
    }

    if (typeof shot.expectedTurn === 'number' && this.mode === 'turn-order' && shot.expectedTurn !== this.turn) {
      this.reconcileHostAuthority({ peerId: this.playerIdsByIndex[action.player], reason: 'expected-turn-mismatch' });
      return this.outEvents;
    }

    const normalizedPower = clamp(shot.power, 0, 1);
    const normalizedAngle = Number.isFinite(shot.angle) ? shot.angle : 0;
    const computedStrokes = clamp(shot.declaredStrokes ?? Math.max(1, Math.round((1 - normalizedPower) * 4) + 1), 1, 12);
    const penalty = clamp(shot.declaredPenalty ?? 0, 0, 5);
    const currentHole = this.course.holes[Math.max(0, Math.min(this.course.holes.length - 1, this.hole - 1))];
    const normalizedEndX = clamp(shot.endX, currentHole.bounds.x, currentHole.bounds.x + currentHole.bounds.width);
    const normalizedEndY = clamp(shot.endY, currentHole.bounds.y, currentHole.bounds.y + currentHole.bounds.height);
    const declaredOutOfBounds = normalizedEndX !== shot.endX || normalizedEndY !== shot.endY;
    const serverSummary = simulateShotForServer(currentHole, { angle: normalizedAngle, power: normalizedPower });
    const mismatchDistanceSq = distanceSq(serverSummary.finalX, serverSummary.finalY, normalizedEndX, normalizedEndY);

    // TODO: tune this tolerance with telemetry after we have enough live mismatch samples.
    if (
      declaredOutOfBounds ||
      serverSummary.reason === 'invalid' ||
      serverSummary.reason === 'limit' ||
      !Number.isFinite(mismatchDistanceSq) ||
      mismatchDistanceSq > SERVER_VALIDATE_TOLERANCE * SERVER_VALIDATE_TOLERANCE
    ) {
      this.reconcileHostAuthority({
        peerId: this.playerIdsByIndex[action.player],
        reason: 'server-shot-validation-failed'
      });
      this.debugAdmin('server rejected minigolf shot', {
        player: action.player,
        hole: this.hole,
        declaredEnd: { x: normalizedEndX, y: normalizedEndY },
        serverFinal: { x: serverSummary.finalX, y: serverSummary.finalY },
        declaredOutOfBounds,
        reason: serverSummary.reason,
        mismatchDistanceSq
      });
      this.flushQueuedResync();
      return this.outEvents;
    }

    this.strokes[action.player] = computedStrokes;
    this.penalties[action.player] = penalty;
    this.totals[action.player] += computedStrokes + penalty;
    this.ballEnd[action.player] = {
      x: serverSummary.finalX,
      y: serverSummary.finalY
    };
    this.holePlayed[action.player] = true;

    if (this.mode === 'turn-order') {
      this.turn = this.turn === 0 ? 1 : 0;
    }

    if (this.holePlayed[0] && this.holePlayed[1]) {
      this.holePlayed[0] = false;
      this.holePlayed[1] = false;
      this.hole += 1;
      this.strokes[0] = 0;
      this.strokes[1] = 0;
      this.penalties[0] = 0;
      this.penalties[1] = 0;
      this.turn = 0;
    }

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'stroke_result',
      eventId: this.lastEventId,
      player: action.player,
      hole: this.hole,
      nextPlayer: this.turn,
      finalBall: { p0: this.ballEnd[0], p1: this.ballEnd[1] },
      strokes: { p0: this.strokes[0], p1: this.strokes[1] },
      penalties: { p0: this.penalties[0], p1: this.penalties[1] },
      totals: { p0: this.totals[0], p1: this.totals[1] },
      checksum: this.computeChecksum()
    });

    if (this.stepCounter % this.checksumEverySteps === 0) {
      this.lastEventId += 1;
      this.outEvents.push({ type: 'state_checksum', eventId: this.lastEventId, checksum: this.computeChecksum(), hole: this.hole });
    }

    if (this.hole > this.totalHoles) {
      const winner: PlayerIndex = this.totals[0] <= this.totals[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner,
        totals: { p0: this.totals[0], p1: this.totals[1] }
      });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        totals: `${this.totals[0]}-${this.totals[1]}`,
        mode: this.mode
      };
    }

    return this.outEvents;
  }

  getResult(): MinigolfResult | null {
    return this.result;
  }

  private computeChecksum(): number {
    let hash = 17;
    hash = (hash * 31 + this.hole) | 0;
    hash = (hash * 31 + this.turn) | 0;
    hash = (hash * 31 + this.strokes[0]) | 0;
    hash = (hash * 31 + this.strokes[1]) | 0;
    hash = (hash * 31 + this.penalties[0]) | 0;
    hash = (hash * 31 + this.penalties[1]) | 0;
    hash = (hash * 31 + this.totals[0]) | 0;
    hash = (hash * 31 + this.totals[1]) | 0;
    hash = (hash * 31 + Math.round(this.ballEnd[0].x * 10)) | 0;
    hash = (hash * 31 + Math.round(this.ballEnd[0].y * 10)) | 0;
    hash = (hash * 31 + Math.round(this.ballEnd[1].x * 10)) | 0;
    hash = (hash * 31 + Math.round(this.ballEnd[1].y * 10)) | 0;
    return hash >>> 0;
  }

  private debugAdmin(message: string, details: Record<string, unknown>) {
    console.debug(`[minigolf-mp][admin] ${message}`, details);
  }

  reconcileHostAuthority(context: { peerId?: string; reason: string; snapshotTick?: number }) {
    this.pending = [];
    this.forceResync = true;
    this.queuedResync = true;
    this.debugAdmin('HOST_AUTH_RECONCILE', {
      peerId: context.peerId ?? 'unknown',
      reason: context.reason,
      snapshotTick: context.snapshotTick ?? this.stepCounter
    });
    return {
      type: 'state_resync' as const,
      eventId: this.lastEventId + 1,
      snapshot: this.getSnapshot()
    };
  }

  updateHostPlayerId(hostPlayerId: string) {
    if (typeof hostPlayerId !== 'string' || hostPlayerId.length === 0) return;
    this.hostPlayerId = hostPlayerId;
    if (!this.playerIdsByIndex.includes(hostPlayerId)) {
      this.playerIdsByIndex[0] = hostPlayerId;
    }
  }

  private emitStateResync() {
    this.lastEventId += 1;
    const event: MinigolfEvent = {
      type: 'state_resync',
      eventId: this.lastEventId,
      snapshot: this.getSnapshot()
    };
    this.outEvents.push(event);
    return event;
  }

  private flushQueuedResync() {
    if (!this.queuedResync) return null;
    this.queuedResync = false;
    const event = this.emitStateResync();
    this.forceResync = false;
    return event;
  }

  private reset() {
    this.phase = 'live';
    this.hole = 1;
    this.totalHoles = 18;
    this.turn = 0;
    this.strokes[0] = 0;
    this.strokes[1] = 0;
    this.penalties[0] = 0;
    this.penalties[1] = 0;
    this.totals[0] = 0;
    this.totals[1] = 0;
    this.ballEnd[0] = { x: 0, y: 0 };
    this.ballEnd[1] = { x: 0, y: 0 };
    this.holePlayed = [false, false];
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
    this.forceResync = false;
    this.queuedResync = false;
    this.stepCounter = 0;
  }
}

export const minigolfMpAdapter = new MinigolfMultiplayerAdapter();
