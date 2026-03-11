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

type BowlingMode = 'classic' | 'challenge';

interface BowlingInput {
  playerIndex?: number;
  power: number;
  hook: number;
}

interface BowlingSnapshot {
  mode: BowlingMode;
  phase: 'live' | 'end';
  turn: PlayerIndex;
  frame: number;
  rollInFrame: number;
  pinsStanding: number;
  totals: { p0: number; p1: number };
  lastRoll: { player: PlayerIndex; pins: number };
  lastEventId: number;
}

type BowlingEvent =
  | {
      type: 'roll_result';
      eventId: number;
      player: PlayerIndex;
      frame: number;
      rollInFrame: number;
      pins: number;
      totals: { p0: number; p1: number };
      turn: PlayerIndex;
      pinsStanding: number;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; totals: { p0: number; p1: number } };

interface BowlingResult {
  winner: 'p0' | 'p1' | 'none';
  mode: BowlingMode;
  totals: string;
}

function toMode(value: unknown): BowlingMode {
  return value === 'challenge' ? 'challenge' : 'classic';
}

export class AlleyBowlingBlitzMultiplayerAdapter
  implements MpAdapter<BowlingInput, BowlingSnapshot, BowlingEvent, BowlingResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: BowlingMode = 'classic';
  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private frame = 1;
  private rollInFrame = 1;
  private pinsStanding = 10;

  private totals = new Uint16Array(2);
  private lastRoll: { player: PlayerIndex; pins: number } = { player: 0, pins: 0 };

  private lastEventId = 0;
  private result: BowlingResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: BowlingInput }> = [];
  private outEvents: BowlingEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: BowlingInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const power = readNumber(env.input.power, Number.NaN);
    const hook = readNumber(env.input.hook, 0);
    if (!Number.isFinite(power)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        power: clamp(power, 0, 1),
        hook: clamp(hook, -1, 1)
      }
    });
  }

  getSnapshot(): BowlingSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      turn: this.turn,
      frame: this.frame,
      rollInFrame: this.rollInFrame,
      pinsStanding: this.pinsStanding,
      totals: { p0: this.totals[0], p1: this.totals[1] },
      lastRoll: this.lastRoll,
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: BowlingSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.frame = snapshot.frame;
    this.rollInFrame = snapshot.rollInFrame;
    this.pinsStanding = snapshot.pinsStanding;
    this.totals[0] = snapshot.totals.p0;
    this.totals[1] = snapshot.totals.p1;
    this.lastRoll = snapshot.lastRoll;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: BowlingEvent): unknown {
    return event;
  }

  applyEvent(event: BowlingEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'roll_result') {
      this.turn = event.turn;
      this.frame = event.frame;
      this.rollInFrame = event.rollInFrame;
      this.pinsStanding = event.pinsStanding;
      this.totals[0] = event.totals.p0;
      this.totals[1] = event.totals.p1;
      this.lastRoll = { player: event.player, pins: event.pins };
      return;
    }

    this.phase = 'end';
    this.totals[0] = event.totals.p0;
    this.totals[1] = event.totals.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      mode: this.mode,
      totals: `${event.totals.p0}-${event.totals.p1}`
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): BowlingEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;

    const power = clamp(action.input.power, 0, 1);
    const hook = clamp(action.input.hook, -1, 1);
    const variance = (seedStep(this.seedRef) - 0.5) * 2;
    const knocked = Math.max(0, Math.min(this.pinsStanding, Math.round(power * 9 + (1 - Math.abs(hook)) * 2 + variance)));

    this.pinsStanding -= knocked;
    this.totals[action.player] += knocked;
    this.lastRoll = { player: action.player, pins: knocked };

    const strike = this.rollInFrame === 1 && this.pinsStanding === 0;
    const spare = this.rollInFrame === 2 && this.pinsStanding === 0;

    if (strike || spare || this.rollInFrame === 2) {
      this.turn = this.turn === 0 ? 1 : 0;
      if (this.turn === 0) this.frame += 1;
      this.rollInFrame = 1;
      this.pinsStanding = 10;
    } else {
      this.rollInFrame = 2;
    }

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'roll_result',
      eventId: this.lastEventId,
      player: action.player,
      frame: this.frame,
      rollInFrame: this.rollInFrame,
      pins: knocked,
      totals: { p0: this.totals[0], p1: this.totals[1] },
      turn: this.turn,
      pinsStanding: this.pinsStanding
    });

    if (this.frame > 10) {
      const winner: PlayerIndex = this.totals[0] >= this.totals[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({ type: 'match_end', eventId: this.lastEventId, winner, totals: { p0: this.totals[0], p1: this.totals[1] } });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        totals: `${this.totals[0]}-${this.totals[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): BowlingResult | null {
    return this.result;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.frame = 1;
    this.rollInFrame = 1;
    this.pinsStanding = 10;
    this.totals[0] = 0;
    this.totals[1] = 0;
    this.lastRoll = { player: 0, pins: 0 };
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const alley_bowling_blitzMpAdapter = new AlleyBowlingBlitzMultiplayerAdapter();
