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

interface WheelInput {
  playerIndex?: number;
  x?: number;
  y?: number;
  pressed?: boolean;
}

interface WheelSnapshot {
  phase: 'live' | 'end';
  turn: PlayerIndex;
  round: number;
  bank: { p0: number; p1: number };
  strikes: { p0: number; p1: number };
  lettersSolved: number;
  lettersTotal: number;
  pendingValue: number;
  score: { p0: number; p1: number };
  lastAction: string;
  lastEventId: number;
}

type WheelEvent =
  | {
      type: 'turn_result';
      eventId: number;
      player: PlayerIndex;
      outcome: 'hit' | 'miss' | 'bankrupt' | 'solve';
      turn: PlayerIndex;
      round: number;
      bank: { p0: number; p1: number };
      strikes: { p0: number; p1: number };
      lettersSolved: number;
      score: { p0: number; p1: number };
      action: string;
    }
  | {
      type: 'match_end';
      eventId: number;
      winner: PlayerIndex;
      score: { p0: number; p1: number };
      bank: { p0: number; p1: number };
      lettersSolved: number;
      lettersTotal: number;
    };

interface WheelResult {
  winner: 'p0' | 'p1' | 'none';
  score: string;
}

const WHEEL_SEGMENTS = [150, 200, 250, 300, 350, 400, 500, 600, 700, -1, -2] as const;

export class WheelOfFortuneMultiplayerAdapter implements MpAdapter<WheelInput, WheelSnapshot, WheelEvent, WheelResult> {
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private round = 1;

  private bank = new Uint16Array(2);
  private strikes = new Uint8Array(2);
  private score = new Uint16Array(2);

  private lettersSolved = 0;
  private lettersTotal = 0;
  private pendingValue = 0;
  private lastAction = 'spin to start';

  private lastEventId = 0;
  private result: WheelResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: WheelInput }> = [];
  private outEvents: WheelEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.reset();
  }

  onInput(localInput: WheelInput): void {
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

  getSnapshot(): WheelSnapshot {
    return {
      phase: this.phase,
      turn: this.turn,
      round: this.round,
      bank: { p0: this.bank[0], p1: this.bank[1] },
      strikes: { p0: this.strikes[0], p1: this.strikes[1] },
      lettersSolved: this.lettersSolved,
      lettersTotal: this.lettersTotal,
      pendingValue: this.pendingValue,
      score: { p0: this.score[0], p1: this.score[1] },
      lastAction: this.lastAction,
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: WheelSnapshot): void {
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.round = snapshot.round;
    this.bank[0] = snapshot.bank.p0;
    this.bank[1] = snapshot.bank.p1;
    this.strikes[0] = snapshot.strikes.p0;
    this.strikes[1] = snapshot.strikes.p1;
    this.lettersSolved = snapshot.lettersSolved;
    this.lettersTotal = snapshot.lettersTotal;
    this.pendingValue = snapshot.pendingValue;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.lastAction = snapshot.lastAction;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: WheelEvent): unknown {
    return event;
  }

  applyEvent(event: WheelEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'turn_result') {
      this.turn = event.turn;
      this.round = event.round;
      this.bank[0] = event.bank.p0;
      this.bank[1] = event.bank.p1;
      this.strikes[0] = event.strikes.p0;
      this.strikes[1] = event.strikes.p1;
      this.lettersSolved = event.lettersSolved;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      this.lastAction = event.action;
      return;
    }

    this.phase = 'end';
    this.bank[0] = event.bank.p0;
    this.bank[1] = event.bank.p1;
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
    this.lettersSolved = event.lettersSolved;
    this.lettersTotal = event.lettersTotal;
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

  step(): WheelEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;
    if (action.input.pressed === false) return this.outEvents;

    const x = clamp(Number(action.input.x ?? 0), -1, 1);
    const y = clamp(Number(action.input.y ?? 0), -1, 1);

    let outcome: Extract<WheelEvent, { type: 'turn_result' }>['outcome'] = 'miss';
    let actionText = `P${action.player} misses`;

    if (x > 0.45 && y > 0.2) {
      const solvedNow = this.trySolve(action.player);
      outcome = solvedNow ? 'solve' : 'miss';
      actionText = solvedNow ? `P${action.player} solves the puzzle` : `P${action.player} fails solve`;
      if (!solvedNow) {
        this.strikes[action.player] = Math.min(5, this.strikes[action.player] + 1);
        this.turn = action.player === 0 ? 1 : 0;
      }
    } else {
      const segment = WHEEL_SEGMENTS[Math.floor(seedStep(this.seedRef) * WHEEL_SEGMENTS.length)];
      if (segment === -1) {
        this.bank[action.player] = 0;
        this.strikes[action.player] = Math.min(5, this.strikes[action.player] + 1);
        this.turn = action.player === 0 ? 1 : 0;
        outcome = 'bankrupt';
        actionText = `P${action.player} hits BANKRUPT`;
      } else if (segment === -2) {
        this.strikes[action.player] = Math.min(5, this.strikes[action.player] + 1);
        this.turn = action.player === 0 ? 1 : 0;
        outcome = 'miss';
        actionText = `P${action.player} loses turn`;
      } else {
        this.pendingValue = segment;
        const vowelAttempt = y < -0.35 && this.bank[action.player] >= 250;
        if (vowelAttempt) {
          this.bank[action.player] -= 250;
        }

        const reveal = this.rollReveals(x, y, vowelAttempt ? 2 : 4);
        if (reveal > 0) {
          const points = reveal * this.pendingValue;
          this.bank[action.player] += points;
          this.score[action.player] += points;
          this.lettersSolved = Math.min(this.lettersTotal, this.lettersSolved + reveal);
          outcome = 'hit';
          actionText = `P${action.player} reveals ${reveal} letters`;
        } else {
          this.turn = action.player === 0 ? 1 : 0;
          outcome = 'miss';
          this.strikes[action.player] = Math.min(5, this.strikes[action.player] + 1);
          actionText = `P${action.player} whiffs`;
        }
      }
    }

    this.round += this.turn === 0 ? 1 : 0;
    this.lastAction = actionText;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'turn_result',
      eventId: this.lastEventId,
      player: action.player,
      outcome,
      turn: this.turn,
      round: this.round,
      bank: { p0: this.bank[0], p1: this.bank[1] },
      strikes: { p0: this.strikes[0], p1: this.strikes[1] },
      lettersSolved: this.lettersSolved,
      score: { p0: this.score[0], p1: this.score[1] },
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
        bank: { p0: this.bank[0], p1: this.bank[1] },
        lettersSolved: this.lettersSolved,
        lettersTotal: this.lettersTotal
      });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): WheelResult | null {
    return this.result;
  }

  private rollReveals(x: number, y: number, max: number): number {
    const revealChance = 0.25 + clamp(1 - Math.abs(x), 0, 1) * 0.35 + clamp(1 - Math.abs(y), 0, 1) * 0.2;
    let reveals = 0;
    for (let i = 0; i < max; i += 1) {
      if (seedStep(this.seedRef) < revealChance) reveals += 1;
    }
    const remaining = this.lettersTotal - this.lettersSolved;
    return Math.max(0, Math.min(remaining, reveals));
  }

  private trySolve(player: PlayerIndex): boolean {
    const completion = this.lettersSolved / Math.max(1, this.lettersTotal);
    const successChance = 0.18 + completion * 0.72;
    const success = seedStep(this.seedRef) < successChance;

    if (success) {
      const bonus = 300 + Math.round((1 - completion) * 180);
      this.lettersSolved = this.lettersTotal;
      this.score[player] += bonus;
      this.bank[player] += bonus;
    }

    return success;
  }

  private resolveWinner(): PlayerIndex | null {
    if (this.lettersSolved >= this.lettersTotal) {
      return this.score[0] >= this.score[1] ? 0 : 1;
    }

    if (this.strikes[0] >= 5 && this.strikes[1] >= 5) {
      return this.score[0] >= this.score[1] ? 0 : 1;
    }

    if (this.round > 18) {
      return this.score[0] >= this.score[1] ? 0 : 1;
    }

    return null;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.round = 1;
    this.bank[0] = 0;
    this.bank[1] = 0;
    this.strikes[0] = 0;
    this.strikes[1] = 0;
    this.score[0] = 0;
    this.score[1] = 0;
    this.lettersTotal = 14 + Math.floor(seedStep(this.seedRef) * 9);
    this.lettersSolved = 0;
    this.pendingValue = 0;
    this.lastAction = 'spin to start';
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const wheel_of_fortuneMpAdapter = new WheelOfFortuneMultiplayerAdapter();
