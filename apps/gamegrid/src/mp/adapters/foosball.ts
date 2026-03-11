import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import {
  clamp,
  normalizePlayers,
  readInputEnvelope,
  readNumber,
  readNumberOption,
  resolveSlotByPlayerId,
  safePlayerIndex,
  seedStep,
  type PlayerIndex
} from './common';

interface FoosballInput {
  playerIndex?: number;
  rodOffset: number;
  rodGesture: number;
  selectedRod: number;
}

interface FoosballSnapshot {
  tick: number;
  timeMs: number;
  rods: {
    home: { offset: number; gesture: number; selectedRod: number };
    away: { offset: number; gesture: number; selectedRod: number };
  };
  ball: { x: number; y: number; vx: number; vy: number };
  score: { home: number; away: number };
  phase: 'live' | 'end';
  mode: 'duel' | 'drills';
  lastEventId: number;
}

type FoosballEvent =
  | { type: 'goal'; eventId: number; winner: PlayerIndex; score: { home: number; away: number } }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { home: number; away: number } };

interface FoosballResult {
  winner: 'home' | 'away' | 'none';
  score: string;
  mode: 'duel' | 'drills';
}

const FIELD_HALF_WIDTH = 320;
const FIELD_HALF_HEIGHT = 510;
const ROD_SPEED = 520;
const GOAL_TARGET = 5;

function toMode(value: unknown): 'duel' | 'drills' {
  return value === 'drills' ? 'drills' : 'duel';
}

export class FoosballMultiplayerAdapter implements MpAdapter<FoosballInput, FoosballSnapshot, FoosballEvent, FoosballResult> {
  readonly isTurnBased = false;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private tick = 0;
  private timeMs = 0;
  private started = false;
  private mode: 'duel' | 'drills' = 'duel';
  private phase: 'live' | 'end' = 'live';

  private rodOffset = new Float32Array(2);
  private rodGesture = new Float32Array(2);
  private selectedRod = new Uint8Array(2);
  private rodTarget = new Float32Array(2);

  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private score = new Uint16Array(2);
  private lastEventId = 0;
  private result: FoosballResult | null = null;
  private outEvents: FoosballEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.mode = toMode(context.options?.mode);
    this.seedRef.value = context.seed || 1;
    this.reset();
  }

  onInput(localInput: FoosballInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.applyInput(slot, localInput);
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') {
      const env = readInputEnvelope(msg);
      if (!env) return;
      const rodOffset = readNumber(env.input.rodOffset, Number.NaN);
      if (!Number.isFinite(rodOffset)) return;
      const rodGesture = readNumber(env.input.rodGesture, 0);
      const selectedRod = readNumber(env.input.selectedRod, 0);
      const slot = safePlayerIndex(env.input.playerIndex);
      if (slot !== null) {
        this.applyInput(slot, {
          playerIndex: slot,
          rodOffset: clamp(rodOffset, -180, 180),
          rodGesture: clamp(rodGesture, -1, 1),
          selectedRod: clamp(Math.round(selectedRod), 0, 3)
        });
      }
      return;
    }

    const env = readInputEnvelope(msg);
    if (!env) return;
    const rodOffset = readNumber(env.input.rodOffset, Number.NaN);
    if (!Number.isFinite(rodOffset)) return;
    const rodGesture = readNumber(env.input.rodGesture, 0);
    const selectedRod = readNumber(env.input.selectedRod, 0);

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.applyInput(slot, {
      playerIndex: byPayload ?? slot,
      rodOffset: clamp(rodOffset, -180, 180),
      rodGesture: clamp(rodGesture, -1, 1),
      selectedRod: clamp(Math.round(selectedRod), 0, 3)
    });
  }

  getSnapshot(): FoosballSnapshot {
    return {
      tick: this.tick,
      timeMs: this.timeMs,
      rods: {
        home: { offset: this.rodOffset[0], gesture: this.rodGesture[0], selectedRod: this.selectedRod[0] },
        away: { offset: this.rodOffset[1], gesture: this.rodGesture[1], selectedRod: this.selectedRod[1] }
      },
      ball: { ...this.ball },
      score: { home: this.score[0], away: this.score[1] },
      phase: this.phase,
      mode: this.mode,
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: FoosballSnapshot): void {
    this.tick = snapshot.tick;
    this.timeMs = snapshot.timeMs;
    this.rodOffset[0] = snapshot.rods.home.offset;
    this.rodOffset[1] = snapshot.rods.away.offset;
    this.rodGesture[0] = snapshot.rods.home.gesture;
    this.rodGesture[1] = snapshot.rods.away.gesture;
    this.selectedRod[0] = snapshot.rods.home.selectedRod;
    this.selectedRod[1] = snapshot.rods.away.selectedRod;
    this.ball = { ...snapshot.ball };
    this.score[0] = snapshot.score.home;
    this.score[1] = snapshot.score.away;
    this.phase = snapshot.phase;
    this.mode = snapshot.mode;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: FoosballEvent): unknown {
    return event;
  }

  applyEvent(event: FoosballEvent): void {
    this.lastEventId = Math.max(this.lastEventId, event.eventId);
    if (event.type === 'goal') {
      this.score[0] = event.score.home;
      this.score[1] = event.score.away;
      return;
    }

    if (event.type === 'match_end') {
      this.phase = 'end';
      this.score[0] = event.score.home;
      this.score[1] = event.score.away;
      this.result = {
        winner: event.winner === 0 ? 'home' : 'away',
        score: `${event.score.home}-${event.score.away}`,
        mode: this.mode
      };
    }
  }

  start(): void {
    this.started = true;
    this.phase = 'live';
  }

  stop(): void {
    this.started = false;
  }

  step(dtS: number): FoosballEvent[] {
    this.outEvents = [];
    if (!this.started || this.phase === 'end' || dtS <= 0) return this.outEvents;

    this.tick += 1;
    this.timeMs += dtS * 1000;

    for (let slot: PlayerIndex = 0; slot < 2; slot += 1) {
      const delta = this.rodTarget[slot] - this.rodOffset[slot];
      const step = clamp(delta, -ROD_SPEED * dtS, ROD_SPEED * dtS);
      this.rodOffset[slot] = clamp(this.rodOffset[slot] + step, -170, 170);
    }

    const spinBoost = (this.rodGesture[0] - this.rodGesture[1]) * 22;
    this.ball.vx = clamp(this.ball.vx + spinBoost * dtS, -460, 460);
    this.ball.x += this.ball.vx * dtS;
    this.ball.y += this.ball.vy * dtS;

    if (Math.abs(this.ball.x) > FIELD_HALF_WIDTH) {
      this.ball.x = clamp(this.ball.x, -FIELD_HALF_WIDTH, FIELD_HALF_WIDTH);
      this.ball.vx *= -0.92;
    }

    if (this.ball.y < -FIELD_HALF_HEIGHT || this.ball.y > FIELD_HALF_HEIGHT) {
      const winner: PlayerIndex = this.ball.y < 0 ? 0 : 1;
      this.score[winner] += 1;
      this.lastEventId += 1;
      this.outEvents.push({ type: 'goal', eventId: this.lastEventId, winner, score: { home: this.score[0], away: this.score[1] } });

      if (this.score[winner] >= readNumberOption({ goalTarget: GOAL_TARGET }, 'goalTarget', GOAL_TARGET)) {
        this.phase = 'end';
        this.lastEventId += 1;
        this.outEvents.push({ type: 'match_end', eventId: this.lastEventId, winner, score: { home: this.score[0], away: this.score[1] } });
        this.result = {
          winner: winner === 0 ? 'home' : 'away',
          score: `${this.score[0]}-${this.score[1]}`,
          mode: this.mode
        };
      }

      this.resetBall();
    }

    return this.outEvents;
  }

  getResult(): FoosballResult | null {
    return this.result;
  }

  private applyInput(slot: PlayerIndex, input: FoosballInput) {
    this.rodTarget[slot] = clamp(input.rodOffset, -170, 170);
    this.rodGesture[slot] = clamp(input.rodGesture, -1, 1);
    this.selectedRod[slot] = Math.max(0, Math.min(3, input.selectedRod | 0));
  }

  private reset() {
    this.tick = 0;
    this.timeMs = 0;
    this.started = false;
    this.phase = 'live';
    this.score[0] = 0;
    this.score[1] = 0;
    this.lastEventId = 0;
    this.result = null;

    this.rodOffset[0] = 0;
    this.rodOffset[1] = 0;
    this.rodGesture[0] = 0;
    this.rodGesture[1] = 0;
    this.selectedRod[0] = 1;
    this.selectedRod[1] = 1;
    this.rodTarget[0] = 0;
    this.rodTarget[1] = 0;

    this.resetBall();
  }

  private resetBall() {
    const dir = seedStep(this.seedRef) > 0.5 ? 1 : -1;
    this.ball = {
      x: 0,
      y: 0,
      vx: (seedStep(this.seedRef) * 320 + 110) * dir,
      vy: (seedStep(this.seedRef) * 340 + 170) * (dir > 0 ? 1 : -1)
    };
  }
}

export const foosballMpAdapter = new FoosballMultiplayerAdapter();
