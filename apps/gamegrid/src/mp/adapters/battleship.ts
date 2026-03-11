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

interface BattleshipInput {
  playerIndex?: number;
  x?: number;
  y?: number;
  pressed?: boolean;
}

interface BattleshipSnapshot {
  phase: 'live' | 'end';
  turn: PlayerIndex;
  shots: { p0: number; p1: number };
  hits: { p0: number; p1: number };
  fleetHp: { p0: number; p1: number };
  lastAction: string;
  score: { p0: number; p1: number };
  lastEventId: number;
}

type BattleshipEvent =
  | {
      type: 'shot_result';
      eventId: number;
      player: PlayerIndex;
      hit: boolean;
      turn: PlayerIndex;
      shots: { p0: number; p1: number };
      hits: { p0: number; p1: number };
      fleetHp: { p0: number; p1: number };
      score: { p0: number; p1: number };
      action: string;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { p0: number; p1: number }; fleetHp: { p0: number; p1: number } };

interface BattleshipResult {
  winner: 'p0' | 'p1' | 'none';
  score: string;
}

export class BattleshipMultiplayerAdapter
  implements MpAdapter<BattleshipInput, BattleshipSnapshot, BattleshipEvent, BattleshipResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;

  private shots = new Uint8Array(2);
  private hits = new Uint8Array(2);
  private fleetHp = new Int8Array(2);
  private score = new Uint16Array(2);
  private lastAction = 'opening salvo';

  private triedByPlayer: Array<Set<number>> = [new Set<number>(), new Set<number>()];

  private lastEventId = 0;
  private result: BattleshipResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: BattleshipInput }> = [];
  private outEvents: BattleshipEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.reset();
  }

  onInput(localInput: BattleshipInput): void {
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

  getSnapshot(): BattleshipSnapshot {
    return {
      phase: this.phase,
      turn: this.turn,
      shots: { p0: this.shots[0], p1: this.shots[1] },
      hits: { p0: this.hits[0], p1: this.hits[1] },
      fleetHp: { p0: this.fleetHp[0], p1: this.fleetHp[1] },
      lastAction: this.lastAction,
      score: { p0: this.score[0], p1: this.score[1] },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: BattleshipSnapshot): void {
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.shots[0] = snapshot.shots.p0;
    this.shots[1] = snapshot.shots.p1;
    this.hits[0] = snapshot.hits.p0;
    this.hits[1] = snapshot.hits.p1;
    this.fleetHp[0] = snapshot.fleetHp.p0;
    this.fleetHp[1] = snapshot.fleetHp.p1;
    this.lastAction = snapshot.lastAction;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: BattleshipEvent): unknown {
    return event;
  }

  applyEvent(event: BattleshipEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'shot_result') {
      this.turn = event.turn;
      this.shots[0] = event.shots.p0;
      this.shots[1] = event.shots.p1;
      this.hits[0] = event.hits.p0;
      this.hits[1] = event.hits.p1;
      this.fleetHp[0] = event.fleetHp.p0;
      this.fleetHp[1] = event.fleetHp.p1;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      this.lastAction = event.action;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
    this.fleetHp[0] = event.fleetHp.p0;
    this.fleetHp[1] = event.fleetHp.p1;
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

  step(): BattleshipEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;
    if (action.input.pressed === false) return this.outEvents;

    const enemy: PlayerIndex = action.player === 0 ? 1 : 0;
    const targetId = this.toTargetCell(action.input);
    if (this.triedByPlayer[action.player].has(targetId)) return this.outEvents;

    this.triedByPlayer[action.player].add(targetId);
    this.shots[action.player] += 1;

    const aimBias = 0.45 + clamp(1 - Math.abs(Number(action.input.x ?? 0)), 0, 1) * 0.2;
    const pressure = clamp(this.fleetHp[enemy] / 14, 0.2, 1);
    const hitChance = aimBias * pressure;
    const hit = seedStep(this.seedRef) < hitChance;

    if (hit) {
      this.hits[action.player] += 1;
      this.fleetHp[enemy] = Math.max(0, this.fleetHp[enemy] - 1);
      this.score[action.player] += 15;
      this.lastAction = `P${action.player} hits sector ${targetId}`;
      this.turn = action.player;
    } else {
      this.score[action.player] += 2;
      this.lastAction = `P${action.player} misses sector ${targetId}`;
      this.turn = enemy;
    }

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'shot_result',
      eventId: this.lastEventId,
      player: action.player,
      hit,
      turn: this.turn,
      shots: { p0: this.shots[0], p1: this.shots[1] },
      hits: { p0: this.hits[0], p1: this.hits[1] },
      fleetHp: { p0: this.fleetHp[0], p1: this.fleetHp[1] },
      score: { p0: this.score[0], p1: this.score[1] },
      action: this.lastAction
    });

    if (this.fleetHp[enemy] <= 0 || this.shots[0] + this.shots[1] >= 90) {
      const winner: PlayerIndex = this.fleetHp[0] === this.fleetHp[1] ? (this.score[0] >= this.score[1] ? 0 : 1) : this.fleetHp[0] > this.fleetHp[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner,
        score: { p0: this.score[0], p1: this.score[1] },
        fleetHp: { p0: this.fleetHp[0], p1: this.fleetHp[1] }
      });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): BattleshipResult | null {
    return this.result;
  }

  private toTargetCell(input: BattleshipInput): number {
    const xn = clamp(Number(input.x ?? 0), -1, 1);
    const yn = clamp(Number(input.y ?? 0), -1, 1);
    const col = Math.max(0, Math.min(7, Math.floor(((xn + 1) * 0.5) * 8)));
    const row = Math.max(0, Math.min(7, Math.floor(((yn + 1) * 0.5) * 8)));
    return row * 8 + col;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.shots[0] = 0;
    this.shots[1] = 0;
    this.hits[0] = 0;
    this.hits[1] = 0;
    this.fleetHp[0] = 14;
    this.fleetHp[1] = 14;
    this.score[0] = 0;
    this.score[1] = 0;
    this.lastAction = 'opening salvo';
    this.triedByPlayer = [new Set<number>(), new Set<number>()];
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const battleshipMpAdapter = new BattleshipMultiplayerAdapter();
