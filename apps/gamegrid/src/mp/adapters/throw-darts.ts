import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import {
  clamp,
  normalizePlayers,
  readInputEnvelope,
  readNumber,
  resolveSlotByPlayerId,
  safePlayerIndex,
  seedStep,
  type PlayerIndex
} from './common';

type DartsMode = '301' | '501' | 'cricket';

interface ThrowDartsInput {
  playerIndex?: number;
  wedge: number;
  multiplier: 1 | 2 | 3;
}

interface ThrowDartsSnapshot {
  mode: DartsMode;
  turn: PlayerIndex;
  round: number;
  dartsInTurn: number;
  remaining: { p0: number; p1: number };
  cricketMarks: { p0: number; p1: number };
  score: { p0: number; p1: number };
  lastEventId: number;
  phase: 'live' | 'end';
}

type ThrowDartsEvent =
  | {
      type: 'throw';
      eventId: number;
      player: PlayerIndex;
      scored: number;
      busted: boolean;
      turn: PlayerIndex;
      remaining: { p0: number; p1: number };
      score: { p0: number; p1: number };
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { p0: number; p1: number } };

interface ThrowDartsResult {
  winner: 'p0' | 'p1' | 'none';
  mode: DartsMode;
  score: string;
}

function toMode(value: unknown): DartsMode {
  if (value === '501') return '501';
  if (value === 'cricket') return 'cricket';
  return '301';
}

function startRemaining(mode: DartsMode) {
  return mode === '501' ? 501 : 301;
}

export class ThrowDartsMultiplayerAdapter
  implements MpAdapter<ThrowDartsInput, ThrowDartsSnapshot, ThrowDartsEvent, ThrowDartsResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: DartsMode = '301';
  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private round = 1;
  private dartsInTurn = 0;

  private remaining = new Int16Array(2);
  private cricketMarks = new Uint8Array(2);
  private score = new Int16Array(2);
  private lastEventId = 0;
  private result: ThrowDartsResult | null = null;

  private pending: Array<{ player: PlayerIndex; input: ThrowDartsInput }> = [];
  private outEvents: ThrowDartsEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: ThrowDartsInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.enqueue(slot, localInput);
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') {
      return;
    }

    const env = readInputEnvelope(msg);
    if (!env) return;
    const wedge = readNumber(env.input.wedge, Number.NaN);
    const mult = readNumber(env.input.multiplier, 1);
    if (!Number.isFinite(wedge)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.enqueue(slot, {
      playerIndex: byPayload ?? undefined,
      wedge: clamp(Math.round(wedge), 1, 20),
      multiplier: clamp(Math.round(mult), 1, 3) as 1 | 2 | 3
    });
  }

  getSnapshot(): ThrowDartsSnapshot {
    return {
      mode: this.mode,
      turn: this.turn,
      round: this.round,
      dartsInTurn: this.dartsInTurn,
      remaining: { p0: this.remaining[0], p1: this.remaining[1] },
      cricketMarks: { p0: this.cricketMarks[0], p1: this.cricketMarks[1] },
      score: { p0: this.score[0], p1: this.score[1] },
      lastEventId: this.lastEventId,
      phase: this.phase
    };
  }

  applySnapshot(snapshot: ThrowDartsSnapshot): void {
    this.mode = snapshot.mode;
    this.turn = snapshot.turn;
    this.round = snapshot.round;
    this.dartsInTurn = snapshot.dartsInTurn;
    this.remaining[0] = snapshot.remaining.p0;
    this.remaining[1] = snapshot.remaining.p1;
    this.cricketMarks[0] = snapshot.cricketMarks.p0;
    this.cricketMarks[1] = snapshot.cricketMarks.p1;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.lastEventId = snapshot.lastEventId;
    this.phase = snapshot.phase;
  }

  serializeEvent(event: ThrowDartsEvent): unknown {
    return event;
  }

  applyEvent(event: ThrowDartsEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'throw') {
      this.turn = event.turn;
      this.remaining[0] = event.remaining.p0;
      this.remaining[1] = event.remaining.p1;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      mode: this.mode,
      score: `${event.score.p0}-${event.score.p1}`
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): ThrowDartsEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action) return this.outEvents;
    if (action.player !== this.turn) return this.outEvents;

    const wedge = clamp(Math.round(action.input.wedge), 1, 20);
    const mult = action.input.multiplier;
    const rng = Math.floor(seedStep(this.seedRef) * 3) - 1;
    const scored = Math.max(0, wedge * mult + rng);
    let busted = false;

    if (this.mode === 'cricket') {
      this.cricketMarks[action.player] = Math.min(9, this.cricketMarks[action.player] + mult);
      this.score[action.player] += scored;
    } else {
      const nextRemaining = this.remaining[action.player] - scored;
      if (nextRemaining < 0) {
        busted = true;
      } else {
        this.remaining[action.player] = nextRemaining;
        this.score[action.player] += scored;
      }
    }

    this.dartsInTurn += 1;
    const playerWon = this.mode === 'cricket' ? this.cricketMarks[action.player] >= 9 : this.remaining[action.player] === 0;

    if (playerWon) {
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'throw',
        eventId: this.lastEventId,
        player: action.player,
        scored,
        busted,
        turn: this.turn,
        remaining: { p0: this.remaining[0], p1: this.remaining[1] },
        score: { p0: this.score[0], p1: this.score[1] }
      });

      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner: action.player,
        score: { p0: this.score[0], p1: this.score[1] }
      });

      this.result = {
        winner: action.player === 0 ? 'p0' : 'p1',
        mode: this.mode,
        score: `${this.score[0]}-${this.score[1]}`
      };
      return this.outEvents;
    }

    if (this.dartsInTurn >= 3 || busted) {
      this.dartsInTurn = 0;
      this.turn = this.turn === 0 ? 1 : 0;
      if (this.turn === 0) this.round += 1;
    }

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'throw',
      eventId: this.lastEventId,
      player: action.player,
      scored,
      busted,
      turn: this.turn,
      remaining: { p0: this.remaining[0], p1: this.remaining[1] },
      score: { p0: this.score[0], p1: this.score[1] }
    });

    if (this.round > 20) {
      const winner: PlayerIndex = this.score[0] >= this.score[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({ type: 'match_end', eventId: this.lastEventId, winner, score: { p0: this.score[0], p1: this.score[1] } });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): ThrowDartsResult | null {
    return this.result;
  }

  private enqueue(player: PlayerIndex, input: ThrowDartsInput) {
    if (this.role === 'client' && player !== this.localPlayerIndex) return;
    this.pending.push({ player, input });
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.round = 1;
    this.dartsInTurn = 0;
    const opening = this.mode === 'cricket' ? 301 : startRemaining(this.mode);
    this.remaining[0] = opening;
    this.remaining[1] = opening;
    this.cricketMarks[0] = 0;
    this.cricketMarks[1] = 0;
    this.score[0] = 0;
    this.score[1] = 0;
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const throw_dartsMpAdapter = new ThrowDartsMultiplayerAdapter();
