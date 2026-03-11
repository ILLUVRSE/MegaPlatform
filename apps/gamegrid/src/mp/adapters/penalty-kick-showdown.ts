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

interface PenaltyKickInput {
  playerIndex?: number;
  aimX: number;
  timing: number;
  keeperX: number;
}

interface PenaltyKickSnapshot {
  tick: number;
  timeMs: number;
  mode: 'classic' | 'ladder';
  phase: 'live' | 'end';
  shotClockS: number;
  shooterAimX: number;
  keeperX: number;
  ball: { x: number; y: number; vx: number; vy: number; active: boolean };
  score: { shooter: number; keeper: number };
  rounds: { total: number; played: number };
  lastEventId: number;
}

type PenaltyKickEvent =
  | { type: 'shot_result'; eventId: number; goal: boolean; round: number; score: { shooter: number; keeper: number } }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { shooter: number; keeper: number } };

interface PenaltyKickResult {
  winner: 'shooter' | 'keeper' | 'none';
  score: string;
  mode: 'classic' | 'ladder';
}

const SHOT_ROUNDS = 8;

function toMode(value: unknown): 'classic' | 'ladder' {
  return value === 'ladder' ? 'ladder' : 'classic';
}

export class PenaltyKickShowdownMultiplayerAdapter
  implements MpAdapter<PenaltyKickInput, PenaltyKickSnapshot, PenaltyKickEvent, PenaltyKickResult>
{
  readonly isTurnBased = false;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private started = false;
  private mode: 'classic' | 'ladder' = 'classic';
  private phase: 'live' | 'end' = 'live';
  private tick = 0;
  private timeMs = 0;

  private shotClockS = 1.1;
  private shooterAimX = 0;
  private shooterTiming = 0.5;
  private keeperX = 0;
  private ball = { x: 0, y: -220, vx: 0, vy: 0, active: false };

  private score = new Uint16Array(2); // [shooter, keeper]
  private playedRounds = 0;
  private lastEventId = 0;
  private result: PenaltyKickResult | null = null;
  private outEvents: PenaltyKickEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: PenaltyKickInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.applyInput(slot, localInput);
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') {
      const env = readInputEnvelope(msg);
      if (!env) return;
      const aimX = readNumber(env.input.aimX, Number.NaN);
      const timing = readNumber(env.input.timing, 0.5);
      const keeperX = readNumber(env.input.keeperX, 0);
      if (!Number.isFinite(aimX)) return;
      const slot = safePlayerIndex(env.input.playerIndex);
      if (slot !== null) {
        this.applyInput(slot, {
          playerIndex: slot,
          aimX: clamp(aimX, -1, 1),
          timing: clamp(timing, 0, 1),
          keeperX: clamp(keeperX, -1, 1)
        });
      }
      return;
    }

    const env = readInputEnvelope(msg);
    if (!env) return;
    const aimX = readNumber(env.input.aimX, Number.NaN);
    const timing = readNumber(env.input.timing, 0.5);
    const keeperX = readNumber(env.input.keeperX, 0);
    if (!Number.isFinite(aimX)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.applyInput(slot, {
      playerIndex: byPayload ?? slot,
      aimX: clamp(aimX, -1, 1),
      timing: clamp(timing, 0, 1),
      keeperX: clamp(keeperX, -1, 1)
    });
  }

  getSnapshot(): PenaltyKickSnapshot {
    return {
      tick: this.tick,
      timeMs: this.timeMs,
      mode: this.mode,
      phase: this.phase,
      shotClockS: this.shotClockS,
      shooterAimX: this.shooterAimX,
      keeperX: this.keeperX,
      ball: { ...this.ball },
      score: { shooter: this.score[0], keeper: this.score[1] },
      rounds: { total: SHOT_ROUNDS, played: this.playedRounds },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: PenaltyKickSnapshot): void {
    this.tick = snapshot.tick;
    this.timeMs = snapshot.timeMs;
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.shotClockS = snapshot.shotClockS;
    this.shooterAimX = snapshot.shooterAimX;
    this.keeperX = snapshot.keeperX;
    this.ball = { ...snapshot.ball };
    this.score[0] = snapshot.score.shooter;
    this.score[1] = snapshot.score.keeper;
    this.playedRounds = snapshot.rounds.played;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: PenaltyKickEvent): unknown {
    return event;
  }

  applyEvent(event: PenaltyKickEvent): void {
    this.lastEventId = Math.max(this.lastEventId, event.eventId);

    if (event.type === 'shot_result') {
      this.playedRounds = event.round;
      this.score[0] = event.score.shooter;
      this.score[1] = event.score.keeper;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.shooter;
    this.score[1] = event.score.keeper;
    this.result = {
      winner: event.winner === 0 ? 'shooter' : 'keeper',
      score: `${event.score.shooter}-${event.score.keeper}`,
      mode: this.mode
    };
  }

  start(): void {
    this.started = true;
    this.phase = 'live';
  }

  stop(): void {
    this.started = false;
  }

  step(dtS: number): PenaltyKickEvent[] {
    this.outEvents = [];
    if (!this.started || this.phase === 'end' || dtS <= 0) return this.outEvents;

    this.tick += 1;
    this.timeMs += dtS * 1000;

    if (!this.ball.active) {
      this.shotClockS -= dtS;
      if (this.shotClockS <= 0) {
        this.launchShot();
      }
      return this.outEvents;
    }

    this.ball.x += this.ball.vx * dtS;
    this.ball.y += this.ball.vy * dtS;

    if (this.ball.y >= 250) {
      const timingWindow = Math.abs(this.shooterTiming - 0.5);
      const saveWindow = 58 + timingWindow * 44;
      const goal = Math.abs(this.ball.x - this.keeperX) > saveWindow;

      if (goal) this.score[0] += 1;
      else this.score[1] += 1;

      this.playedRounds += 1;
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'shot_result',
        eventId: this.lastEventId,
        goal,
        round: this.playedRounds,
        score: { shooter: this.score[0], keeper: this.score[1] }
      });

      this.ball.active = false;
      this.shotClockS = 1;

      if (this.playedRounds >= SHOT_ROUNDS) {
        const winner: PlayerIndex = this.score[0] >= this.score[1] ? 0 : 1;
        this.phase = 'end';
        this.lastEventId += 1;
        this.outEvents.push({
          type: 'match_end',
          eventId: this.lastEventId,
          winner,
          score: { shooter: this.score[0], keeper: this.score[1] }
        });
        this.result = {
          winner: winner === 0 ? 'shooter' : 'keeper',
          score: `${this.score[0]}-${this.score[1]}`,
          mode: this.mode
        };
      }
    }

    return this.outEvents;
  }

  getResult(): PenaltyKickResult | null {
    return this.result;
  }

  private applyInput(slot: PlayerIndex, input: PenaltyKickInput) {
    if (slot === 0) {
      this.shooterAimX = clamp(input.aimX, -240, 240);
      this.shooterTiming = clamp(input.timing, 0, 1);
      return;
    }

    this.keeperX = clamp(input.keeperX, -240, 240);
  }

  private launchShot() {
    const spread = (seedStep(this.seedRef) - 0.5) * 120;
    this.ball.active = true;
    this.ball.x = clamp(this.shooterAimX + spread, -260, 260);
    this.ball.y = -240;
    this.ball.vx = (seedStep(this.seedRef) - 0.5) * 60;
    this.ball.vy = 440 + (this.mode === 'ladder' ? 90 : 0);
    this.shotClockS = 0;
  }

  private reset() {
    this.started = false;
    this.phase = 'live';
    this.tick = 0;
    this.timeMs = 0;
    this.shotClockS = 1.1;
    this.shooterAimX = 0;
    this.shooterTiming = 0.5;
    this.keeperX = 0;
    this.ball = { x: 0, y: -220, vx: 0, vy: 0, active: false };
    this.score[0] = 0;
    this.score[1] = 0;
    this.playedRounds = 0;
    this.lastEventId = 0;
    this.result = null;
  }
}

export const penalty_kick_showdownMpAdapter = new PenaltyKickShowdownMultiplayerAdapter();
