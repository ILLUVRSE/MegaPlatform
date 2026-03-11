import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import {
  clamp,
  normalizePlayers,
  readBoolean,
  readInputEnvelope,
  readNumber,
  resolveSlotByPlayerId,
  safePlayerIndex,
  seedStep,
  type PlayerIndex
} from './common';

interface CheckersInput {
  playerIndex?: number;
  x?: number;
  y?: number;
  pressed?: boolean;
}

interface CheckersSnapshot {
  phase: 'live' | 'end';
  turn: PlayerIndex;
  moveNumber: number;
  pieces: { p0: number; p1: number };
  kings: { p0: number; p1: number };
  score: { p0: number; p1: number };
  lastAction: string;
  lastEventId: number;
}

type CheckersEvent =
  | {
      type: 'move';
      eventId: number;
      player: PlayerIndex;
      capture: boolean;
      crowned: boolean;
      pieces: { p0: number; p1: number };
      kings: { p0: number; p1: number };
      score: { p0: number; p1: number };
      turn: PlayerIndex;
      moveNumber: number;
      action: string;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { p0: number; p1: number }; pieces: { p0: number; p1: number } };

interface CheckersResult {
  winner: 'p0' | 'p1' | 'none';
  score: string;
}

export class CheckersMultiplayerAdapter implements MpAdapter<CheckersInput, CheckersSnapshot, CheckersEvent, CheckersResult> {
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private moveNumber = 1;

  private pieces = new Uint8Array(2);
  private kings = new Uint8Array(2);
  private score = new Uint16Array(2);
  private lastAction = 'opening';

  private lastEventId = 0;
  private result: CheckersResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: CheckersInput }> = [];
  private outEvents: CheckersEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.reset();
  }

  onInput(localInput: CheckersInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;
    const env = readInputEnvelope(msg);
    if (!env) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    const x = readNumber(env.input.x, 0);
    const y = readNumber(env.input.y, 0);
    const pressed = readBoolean(env.input.pressed, true);
    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        x: clamp(x, -1, 1),
        y: clamp(y, -1, 1),
        pressed
      }
    });
  }

  getSnapshot(): CheckersSnapshot {
    return {
      phase: this.phase,
      turn: this.turn,
      moveNumber: this.moveNumber,
      pieces: { p0: this.pieces[0], p1: this.pieces[1] },
      kings: { p0: this.kings[0], p1: this.kings[1] },
      score: { p0: this.score[0], p1: this.score[1] },
      lastAction: this.lastAction,
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: CheckersSnapshot): void {
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.moveNumber = snapshot.moveNumber;
    this.pieces[0] = snapshot.pieces.p0;
    this.pieces[1] = snapshot.pieces.p1;
    this.kings[0] = snapshot.kings.p0;
    this.kings[1] = snapshot.kings.p1;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.lastAction = snapshot.lastAction;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: CheckersEvent): unknown {
    return event;
  }

  applyEvent(event: CheckersEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'move') {
      this.turn = event.turn;
      this.moveNumber = event.moveNumber;
      this.pieces[0] = event.pieces.p0;
      this.pieces[1] = event.pieces.p1;
      this.kings[0] = event.kings.p0;
      this.kings[1] = event.kings.p1;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      this.lastAction = event.action;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
    this.pieces[0] = event.pieces.p0;
    this.pieces[1] = event.pieces.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      score: `${event.score.p0}-${event.score.p1}`
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): CheckersEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;
    if (action.input.pressed === false) return this.outEvents;

    const x = clamp(Number(action.input.x ?? 0), -1, 1);
    const y = clamp(Number(action.input.y ?? 0), -1, 1);

    const aggression = clamp((x + 1) * 0.5, 0, 1);
    const precision = clamp(1 - Math.abs(y), 0, 1);
    const rng = seedStep(this.seedRef);

    const captureChance = 0.2 + aggression * 0.45 + precision * 0.15;
    const crownChance = 0.07 + precision * 0.22;

    const defender: PlayerIndex = action.player === 0 ? 1 : 0;
    const capture = rng < captureChance && this.pieces[defender] > 0;
    const crowned = seedStep(this.seedRef) < crownChance;

    if (capture) {
      this.pieces[defender] = Math.max(0, this.pieces[defender] - 1);
      this.score[action.player] += 12;
      this.lastAction = `P${action.player} captures`;
    } else {
      this.score[action.player] += 3;
      this.lastAction = `P${action.player} advances`;
    }

    if (crowned) {
      this.kings[action.player] = Math.min(this.pieces[action.player], this.kings[action.player] + 1);
      this.score[action.player] += 6;
      this.lastAction += ' and crowns';
    }

    this.turn = defender;
    this.moveNumber += 1;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'move',
      eventId: this.lastEventId,
      player: action.player,
      capture,
      crowned,
      pieces: { p0: this.pieces[0], p1: this.pieces[1] },
      kings: { p0: this.kings[0], p1: this.kings[1] },
      score: { p0: this.score[0], p1: this.score[1] },
      turn: this.turn,
      moveNumber: this.moveNumber,
      action: this.lastAction
    });

    const winner = this.resolveWinner();
    if (winner !== null) {
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner,
        score: { p0: this.score[0], p1: this.score[1] },
        pieces: { p0: this.pieces[0], p1: this.pieces[1] }
      });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): CheckersResult | null {
    return this.result;
  }

  private resolveWinner(): PlayerIndex | null {
    if (this.pieces[0] === 0) return 1;
    if (this.pieces[1] === 0) return 0;
    if (this.moveNumber > 80) {
      return this.score[0] >= this.score[1] ? 0 : 1;
    }
    return null;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.moveNumber = 1;
    this.pieces[0] = 12;
    this.pieces[1] = 12;
    this.kings[0] = 0;
    this.kings[1] = 0;
    this.score[0] = 0;
    this.score[1] = 0;
    this.lastAction = 'opening';
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const checkersMpAdapter = new CheckersMultiplayerAdapter();
