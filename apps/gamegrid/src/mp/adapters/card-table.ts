import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import {
  clamp,
  normalizePlayers,
  readEnum,
  readInputEnvelope,
  readNumber,
  resolveSlotByPlayerId,
  safePlayerIndex,
  seedStep,
  type PlayerIndex
} from './common';

type CardMode = 'blackjack' | 'higher-lower' | '31' | '5-card-draw' | 'forehead-poker' | 'solitaire' | 'texas-holdem';
type CardAction = 'bet' | 'hit' | 'stand' | 'draw' | 'fold' | 'call' | 'raise' | 'hold' | 'guess';

interface CardTableInput {
  playerIndex?: number;
  action: CardAction;
  amount?: number;
  guess?: 'higher' | 'lower';
}

interface CardTableSnapshot {
  mode: CardMode;
  phase: 'live' | 'end';
  handIndex: number;
  maxHands: number;
  turn: PlayerIndex;
  bankroll: { p0: number; p1: number };
  pot: number;
  bets: { p0: number; p1: number };
  hands: { p0: number; p1: number };
  lastEventId: number;
}

const CARD_ACTIONS = ['bet', 'hit', 'stand', 'draw', 'fold', 'call', 'raise', 'hold', 'guess'] as const;
const GUESS_VALUES = ['higher', 'lower'] as const;

type CardTableEvent =
  | {
      type: 'hand_result';
      eventId: number;
      mode: CardMode;
      handIndex: number;
      turn: PlayerIndex;
      winner: PlayerIndex;
      bankroll: { p0: number; p1: number };
      pot: number;
      bets: { p0: number; p1: number };
      hands: { p0: number; p1: number };
    }
  | { type: 'match_end'; eventId: number; mode: CardMode; winner: PlayerIndex; bankroll: { p0: number; p1: number } };

interface CardTableResult {
  winner: 'p0' | 'p1' | 'none';
  mode: CardMode;
  bankroll: string;
}

const SUPPORTED_MODES: readonly CardMode[] = [
  'blackjack',
  'higher-lower',
  '31',
  '5-card-draw',
  'forehead-poker',
  'solitaire',
  'texas-holdem'
] as const;

function toMode(value: unknown): CardMode {
  return SUPPORTED_MODES.includes(value as CardMode) ? (value as CardMode) : 'blackjack';
}

function modePace(mode: CardMode): number {
  if (mode === 'texas-holdem') return 10;
  if (mode === 'solitaire') return 6;
  return 8;
}

export class CardTableMultiplayerAdapter
  implements MpAdapter<CardTableInput, CardTableSnapshot, CardTableEvent, CardTableResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: CardMode = 'blackjack';
  private phase: 'live' | 'end' = 'live';
  private handIndex = 1;
  private maxHands = 8;
  private turn: PlayerIndex = 0;

  private bankroll = new Int16Array(2);
  private bets = new Int16Array(2);
  private hands = new Uint8Array(2);
  private pot = 0;

  private lastEventId = 0;
  private result: CardTableResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: CardTableInput }> = [];
  private outEvents: CardTableEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: CardTableInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const action = readEnum(env.input.action, CARD_ACTIONS, 'bet');

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    const amount = readNumber(env.input.amount, Number.NaN);
    const guess = readEnum(env.input.guess, GUESS_VALUES, 'higher');
    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        action,
        amount: Number.isFinite(amount) ? amount : undefined,
        guess: action === 'guess' ? guess : undefined
      }
    });
  }

  getSnapshot(): CardTableSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      handIndex: this.handIndex,
      maxHands: this.maxHands,
      turn: this.turn,
      bankroll: { p0: this.bankroll[0], p1: this.bankroll[1] },
      pot: this.pot,
      bets: { p0: this.bets[0], p1: this.bets[1] },
      hands: { p0: this.hands[0], p1: this.hands[1] },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: CardTableSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.handIndex = snapshot.handIndex;
    this.maxHands = snapshot.maxHands;
    this.turn = snapshot.turn;
    this.bankroll[0] = snapshot.bankroll.p0;
    this.bankroll[1] = snapshot.bankroll.p1;
    this.pot = snapshot.pot;
    this.bets[0] = snapshot.bets.p0;
    this.bets[1] = snapshot.bets.p1;
    this.hands[0] = snapshot.hands.p0;
    this.hands[1] = snapshot.hands.p1;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: CardTableEvent): unknown {
    return event;
  }

  applyEvent(event: CardTableEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'hand_result') {
      this.mode = event.mode;
      this.handIndex = event.handIndex;
      this.turn = event.turn;
      this.bankroll[0] = event.bankroll.p0;
      this.bankroll[1] = event.bankroll.p1;
      this.pot = event.pot;
      this.bets[0] = event.bets.p0;
      this.bets[1] = event.bets.p1;
      this.hands[0] = event.hands.p0;
      this.hands[1] = event.hands.p1;
      return;
    }

    this.phase = 'end';
    this.mode = event.mode;
    this.bankroll[0] = event.bankroll.p0;
    this.bankroll[1] = event.bankroll.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      mode: event.mode,
      bankroll: `${event.bankroll.p0}-${event.bankroll.p1}`
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): CardTableEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;

    const betBase = clamp(Math.round(action.input.amount ?? 25), 5, 200);
    const bet = Math.min(this.bankroll[action.player], betBase);
    this.bankroll[action.player] -= bet;
    this.bets[action.player] += bet;
    this.pot += bet;

    const opponent = action.player === 0 ? 1 : 0;
    const styleBonus = action.input.action === 'raise' ? 0.17 : action.input.action === 'fold' ? -0.2 : 0;
    const guessBonus = action.input.guess === 'higher' ? 0.04 : action.input.guess === 'lower' ? -0.04 : 0;
    const handStrength = seedStep(this.seedRef) + styleBonus + guessBonus;
    const opponentStrength = seedStep(this.seedRef);
    const winner: PlayerIndex = handStrength >= opponentStrength ? action.player : opponent;

    this.bankroll[winner] += this.pot;
    this.hands[winner] += 1;
    this.pot = 0;
    this.bets[0] = 0;
    this.bets[1] = 0;

    this.handIndex += 1;
    this.turn = opponent;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'hand_result',
      eventId: this.lastEventId,
      mode: this.mode,
      handIndex: this.handIndex,
      turn: this.turn,
      winner,
      bankroll: { p0: this.bankroll[0], p1: this.bankroll[1] },
      pot: this.pot,
      bets: { p0: this.bets[0], p1: this.bets[1] },
      hands: { p0: this.hands[0], p1: this.hands[1] }
    });

    if (this.handIndex > this.maxHands || this.bankroll[0] <= 0 || this.bankroll[1] <= 0) {
      const finalWinner: PlayerIndex = this.bankroll[0] >= this.bankroll[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        mode: this.mode,
        winner: finalWinner,
        bankroll: { p0: this.bankroll[0], p1: this.bankroll[1] }
      });
      this.result = {
        winner: finalWinner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        bankroll: `${this.bankroll[0]}-${this.bankroll[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): CardTableResult | null {
    return this.result;
  }

  private reset() {
    this.phase = 'live';
    this.handIndex = 1;
    this.maxHands = modePace(this.mode);
    this.turn = 0;
    this.bankroll[0] = 1000;
    this.bankroll[1] = 1000;
    this.bets[0] = 0;
    this.bets[1] = 0;
    this.hands[0] = 0;
    this.hands[1] = 0;
    this.pot = 0;
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const card_tableMpAdapter = new CardTableMultiplayerAdapter();
