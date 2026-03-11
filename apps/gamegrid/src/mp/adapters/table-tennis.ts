import type { BallState, PlayerIndex, PointEndReason, ScoringState } from '../../games/table-tennis/types';
import { applyPaddleHit, createBallState, createPhysicsResult, createPhysicsScratch, DEFAULT_TABLE_PHYSICS, resetBallForServer, stepBallPhysics } from '../../games/table-tennis/physics';
import { awardPoint, createScoringState } from '../../games/table-tennis/rules';
import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import { readInputEnvelope, readNumber } from './common';

export type TableTennisMpMode = 'quick_match' | 'best_of_3';

export interface TableTennisInput {
  playerIndex?: number;
  targetX: number;
  velX: number;
  seq?: number;
}

export interface TableTennisSnapshot {
  tick: number;
  timeMs: number;
  ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number; spinX: number; spinY: number };
  paddles: {
    bottom: { x: number; vx: number };
    top: { x: number; vx: number };
  };
  score: { bottom: number; top: number };
  server: PlayerIndex;
  match: {
    phase: 'ready' | 'serve' | 'rally' | 'point' | 'end';
    mode: TableTennisMpMode;
    gameIndex: number;
    games: { bottom: number; top: number };
  };
  lastEventId: number;
}

export type TableTennisMpEvent =
  | { type: 'point'; eventId: number; winner: PlayerIndex; score: { bottom: number; top: number } }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { bottom: number; top: number } }
  | { type: 'rematch'; eventId: number; mode: TableTennisMpMode };

export interface TableTennisResult {
  winner: 'bottom' | 'top' | 'none';
  score: string;
  games: string;
  mode: TableTennisMpMode;
}

const TABLE_X_MIN = -210;
const TABLE_X_MAX = 210;
const PADDLE_MAX_SPEED = 780;
const PLAYER_HIT_WINDOW = 76;
const AI_HIT_WINDOW = 76;
const HIT_COOLDOWN_S = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toMode(value: unknown): TableTennisMpMode {
  return value === 'best_of_3' ? 'best_of_3' : 'quick_match';
}

function safePlayerIndex(value: unknown): PlayerIndex | null {
  return value === 0 || value === 1 ? value : null;
}

function resolveWinner(reason: PointEndReason | null, winner: PlayerIndex | null, ball: BallState): PlayerIndex {
  if (winner !== null) return winner;
  if (reason === 'double_bounce') {
    return ball.y >= 0 ? 1 : 0;
  }
  return ball.lastHitter === 0 ? 1 : 0;
}

function copyScoringFromSnapshot(scoring: ScoringState, snapshot: TableTennisSnapshot) {
  scoring.points[0] = snapshot.score.bottom;
  scoring.points[1] = snapshot.score.top;
  scoring.gamesWon[0] = snapshot.match.games.bottom;
  scoring.gamesWon[1] = snapshot.match.games.top;
  scoring.currentServer = snapshot.server;
  scoring.gameIndex = snapshot.match.gameIndex;
}

function seedStep(seedRef: { value: number }): number {
  let x = seedRef.value | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  seedRef.value = x;
  return (x >>> 0) / 0xffffffff;
}

export class TableTennisMultiplayerAdapter implements MpAdapter<TableTennisInput, TableTennisSnapshot, TableTennisMpEvent, TableTennisResult> {
  readonly isTurnBased = false;

  private role: 'host' | 'client' = 'client';
  private hostPlayerId = '';
  private localPlayerIndex: number = -1;
  private playerIdsByIndex: [string, string] = ['', ''];
  private mode: TableTennisMpMode = 'quick_match';

  private tick = 0;
  private timeMs = 0;
  private started = false;
  private phase: TableTennisSnapshot['match']['phase'] = 'ready';
  private serveCountdownS = 0;
  private pointCountdownS = 0;

  private readonly paddleX = new Float32Array(2);
  private readonly paddleVx = new Float32Array(2);
  private readonly paddleTargetX = new Float32Array(2);
  private readonly paddleIntentVx = new Float32Array(2);
  private readonly hitCooldownS = new Float32Array(2);

  private readonly ball = createBallState();
  private readonly physicsScratch = createPhysicsScratch();
  private readonly physicsResult = createPhysicsResult();

  private scoring: ScoringState = createScoringState('single_game', 0);
  private server: PlayerIndex = 0;

  private seedRef = { value: 1 };
  private lastEventId = 0;
  private result: TableTennisResult | null = null;

  private readonly outEvents: TableTennisMpEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    this.hostPlayerId = String(context.options?.hostPlayerId ?? context.playerId);

    const optionPlayerIndex = Number(context.options?.playerIndex);
    this.localPlayerIndex = Number.isInteger(optionPlayerIndex) ? optionPlayerIndex : -1;

    const players = Array.isArray(context.options?.playerIds) ? (context.options?.playerIds as unknown[]) : [];
    this.playerIdsByIndex = [String(players[0] ?? ''), String(players[1] ?? '')];

    if (!this.playerIdsByIndex[0]) {
      this.playerIdsByIndex[0] = this.hostPlayerId;
    }

    if (this.localPlayerIndex === 0 || this.localPlayerIndex === 1) {
      this.playerIdsByIndex[this.localPlayerIndex] = context.playerId;
    }

    this.mode = toMode(context.options?.mode);
    this.seedRef.value = context.seed || 1;

    this.resetMatch(this.mode);
    this.started = false;
  }

  onInput(localInput: TableTennisInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.applyInputForSlot(slot, localInput);
  }

  onRemoteMessage(msg: unknown): void {
    const env = readInputEnvelope(msg);

    if (this.role !== 'host') {
      if (!env) return;
      const targetX = readNumber(env.input.targetX, Number.NaN);
      const velX = readNumber(env.input.velX, Number.NaN);
      if (!Number.isFinite(targetX) || !Number.isFinite(velX)) return;
      const slot = safePlayerIndex(env.input.playerIndex);
      if (slot !== null) {
        this.applyInputForSlot(slot, {
          playerIndex: slot,
          targetX: clamp(targetX, TABLE_X_MIN, TABLE_X_MAX),
          velX: clamp(velX, -PADDLE_MAX_SPEED, PADDLE_MAX_SPEED),
          seq: typeof env.input.seq === 'number' ? env.input.seq : undefined
        });
      }
      return;
    }

    if (!env) return;
    const targetX = readNumber(env.input.targetX, Number.NaN);
    const velX = readNumber(env.input.velX, Number.NaN);
    if (!Number.isFinite(targetX) || !Number.isFinite(velX)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? this.slotForPlayerId(env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;

    if (slot === null) return;
    this.applyInputForSlot(slot, {
      playerIndex: byPayload ?? slot,
      targetX: clamp(targetX, TABLE_X_MIN, TABLE_X_MAX),
      velX: clamp(velX, -PADDLE_MAX_SPEED, PADDLE_MAX_SPEED),
      seq: typeof env.input.seq === 'number' ? env.input.seq : undefined
    });
  }

  getSnapshot(): TableTennisSnapshot {
    return {
      tick: this.tick,
      timeMs: this.timeMs,
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        z: this.ball.z,
        vx: this.ball.vx,
        vy: this.ball.vy,
        vz: this.ball.vz,
        spinX: this.ball.spinX,
        spinY: this.ball.spinY
      },
      paddles: {
        bottom: { x: this.paddleX[0], vx: this.paddleVx[0] },
        top: { x: this.paddleX[1], vx: this.paddleVx[1] }
      },
      score: {
        bottom: this.scoring.points[0],
        top: this.scoring.points[1]
      },
      server: this.server,
      match: {
        phase: this.phase,
        mode: this.mode,
        gameIndex: this.scoring.gameIndex,
        games: {
          bottom: this.scoring.gamesWon[0],
          top: this.scoring.gamesWon[1]
        }
      },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: TableTennisSnapshot): void {
    this.tick = snapshot.tick;
    this.timeMs = snapshot.timeMs;

    this.ball.x = snapshot.ball.x;
    this.ball.y = snapshot.ball.y;
    this.ball.z = snapshot.ball.z;
    this.ball.vx = snapshot.ball.vx;
    this.ball.vy = snapshot.ball.vy;
    this.ball.vz = snapshot.ball.vz;
    this.ball.spinX = snapshot.ball.spinX;
    this.ball.spinY = snapshot.ball.spinY;
    this.ball.active = snapshot.match.phase === 'rally';

    this.paddleX[0] = snapshot.paddles.bottom.x;
    this.paddleX[1] = snapshot.paddles.top.x;
    this.paddleVx[0] = snapshot.paddles.bottom.vx;
    this.paddleVx[1] = snapshot.paddles.top.vx;

    this.server = snapshot.server;
    this.mode = snapshot.match.mode;
    this.phase = snapshot.match.phase;
    this.lastEventId = snapshot.lastEventId;

    this.scoring = createScoringState(this.mode === 'best_of_3' ? 'best_of_3' : 'single_game', this.server);
    copyScoringFromSnapshot(this.scoring, snapshot);
  }

  serializeEvent(event: TableTennisMpEvent): unknown {
    return event;
  }

  applyEvent(event: TableTennisMpEvent): void {
    if (event.type === 'rematch') {
      this.lastEventId = Math.max(this.lastEventId, event.eventId);
      this.resetMatch(event.mode);
      this.started = true;
      return;
    }

    if (event.type === 'match_end') {
      this.lastEventId = Math.max(this.lastEventId, event.eventId);
      this.phase = 'end';
      this.result = {
        winner: event.winner === 0 ? 'bottom' : 'top',
        score: `${event.score.bottom}-${event.score.top}`,
        games: `${this.scoring.gamesWon[0]}-${this.scoring.gamesWon[1]}`,
        mode: this.mode
      };
      return;
    }

    if (event.type === 'point') {
      this.lastEventId = Math.max(this.lastEventId, event.eventId);
    }
  }

  start(): void {
    this.started = true;
    this.phase = 'ready';
    this.serveCountdownS = 0.4;
    this.pointCountdownS = 0;
  }

  stop(): void {
    this.started = false;
  }

  step(dtS: number): TableTennisMpEvent[] {
    this.outEvents.length = 0;
    if (!this.started || this.phase === 'end' || dtS <= 0) return this.outEvents;

    this.tick += 1;
    this.timeMs += dtS * 1000;

    this.stepPaddle(0, dtS);
    this.stepPaddle(1, dtS);

    this.hitCooldownS[0] = Math.max(0, this.hitCooldownS[0] - dtS);
    this.hitCooldownS[1] = Math.max(0, this.hitCooldownS[1] - dtS);

    if (this.phase === 'ready') {
      this.serveCountdownS -= dtS;
      this.holdBallAtServerPaddle();
      if (this.serveCountdownS <= 0) {
        this.phase = 'serve';
        this.serveCountdownS = 0.8;
      }
      return this.outEvents;
    }

    if (this.phase === 'serve') {
      this.holdBallAtServerPaddle();
      this.serveCountdownS -= dtS;
      if (this.serveCountdownS <= 0) {
        this.launchServe();
      }
      return this.outEvents;
    }

    if (this.phase === 'point') {
      this.pointCountdownS -= dtS;
      if (this.pointCountdownS <= 0) {
        this.beginReadyForServe();
      }
      return this.outEvents;
    }

    if (this.phase !== 'rally') {
      return this.outEvents;
    }

    this.tryAutoHit(0);
    this.tryAutoHit(1);

    stepBallPhysics(this.ball, dtS, DEFAULT_TABLE_PHYSICS, this.physicsScratch, this.physicsResult);

    if (!this.physicsResult.ended) {
      this.tryAutoHit(0);
      this.tryAutoHit(1);
      return this.outEvents;
    }

    const winner = resolveWinner(this.physicsResult.reason, this.physicsResult.winner, this.ball);
    this.ball.active = false;

    this.scoring = awardPoint(this.scoring, winner);
    this.server = this.scoring.currentServer;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'point',
      eventId: this.lastEventId,
      winner,
      score: {
        bottom: this.scoring.points[0],
        top: this.scoring.points[1]
      }
    });

    if (this.scoring.matchWinner !== null) {
      const matchWinner = this.scoring.matchWinner;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner: matchWinner,
        score: {
          bottom: this.scoring.points[0],
          top: this.scoring.points[1]
        }
      });

      this.result = {
        winner: matchWinner === 0 ? 'bottom' : 'top',
        score: `${this.scoring.points[0]}-${this.scoring.points[1]}`,
        games: `${this.scoring.gamesWon[0]}-${this.scoring.gamesWon[1]}`,
        mode: this.mode
      };
      return this.outEvents;
    }

    this.phase = 'point';
    this.pointCountdownS = 0.72;
    return this.outEvents;
  }

  getResult(): TableTennisResult | null {
    return this.result;
  }

  private resetMatch(mode: TableTennisMpMode) {
    this.mode = mode;
    this.tick = 0;
    this.timeMs = 0;
    this.phase = 'ready';
    this.serveCountdownS = 0.4;
    this.pointCountdownS = 0;

    this.paddleX[0] = 0;
    this.paddleX[1] = 0;
    this.paddleVx[0] = 0;
    this.paddleVx[1] = 0;
    this.paddleTargetX[0] = 0;
    this.paddleTargetX[1] = 0;
    this.paddleIntentVx[0] = 0;
    this.paddleIntentVx[1] = 0;
    this.hitCooldownS[0] = 0;
    this.hitCooldownS[1] = 0;

    this.server = 0;
    this.scoring = createScoringState(mode === 'best_of_3' ? 'best_of_3' : 'single_game', 0);
    resetBallForServer(this.ball, this.server);

    this.lastEventId = 0;
    this.result = null;
  }

  private beginReadyForServe() {
    this.phase = 'ready';
    this.serveCountdownS = 0.4;
    resetBallForServer(this.ball, this.server);
  }

  private holdBallAtServerPaddle() {
    this.ball.active = false;
    this.ball.x = this.paddleX[this.server];
    this.ball.y = this.server === 0 ? 238 : -240;
    this.ball.z = 20;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.spinX = 0;
    this.ball.spinY = 0;
  }

  private launchServe() {
    const server = this.server;
    const toOpponent = this.paddleX[1 - server] - this.paddleX[server];
    const rand = seedStep(this.seedRef) - 0.5;

    const shot = {
      dirX: clamp(toOpponent / 190 + rand * 0.14, -0.88, 0.88),
      speed: 0.62 + seedStep(this.seedRef) * 0.12,
      spin: clamp((this.paddleIntentVx[server] / 820) + rand * 0.2, -0.55, 0.55),
      spinHint: 'none' as const
    };

    this.ball.x = this.paddleX[server];
    this.ball.y = server === 0 ? 238 : -240;
    this.ball.z = 20;

    applyPaddleHit(this.ball, shot, server, true);
    this.phase = 'rally';
    this.hitCooldownS[server] = HIT_COOLDOWN_S;
  }

  private tryAutoHit(slot: PlayerIndex) {
    if (!this.ball.active) return;
    if (this.hitCooldownS[slot] > 0) return;

    if (slot === 0) {
      const inWindow = this.ball.vy > 0 && this.ball.y > 140 && this.ball.y < 296 && this.ball.z < 132;
      if (!inWindow) return;
      if (Math.abs(this.ball.x - this.paddleX[slot]) > PLAYER_HIT_WINDOW) return;
    } else {
      const inWindow = this.ball.vy < 0 && this.ball.y < -140 && this.ball.y > -296 && this.ball.z < 132;
      if (!inWindow) return;
      if (Math.abs(this.ball.x - this.paddleX[slot]) > AI_HIT_WINDOW) return;
    }

    const opponent = (1 - slot) as PlayerIndex;
    const shot = {
      dirX: clamp((this.paddleX[opponent] - this.ball.x) / 180 + this.paddleIntentVx[slot] * 0.0011, -1, 1),
      speed: clamp(0.62 + Math.min(0.3, Math.abs(this.paddleIntentVx[slot]) / 920), 0.45, 1),
      spin: clamp(this.paddleIntentVx[slot] / 820, -0.9, 0.9),
      spinHint: 'none' as const
    };

    applyPaddleHit(this.ball, shot, slot, false);
    this.hitCooldownS[slot] = HIT_COOLDOWN_S;
  }

  private stepPaddle(slot: PlayerIndex, dtS: number) {
    const desired = clamp(this.paddleTargetX[slot], TABLE_X_MIN, TABLE_X_MAX);
    const x = this.paddleX[slot];
    const delta = desired - x;
    const maxStep = PADDLE_MAX_SPEED * dtS;
    const step = clamp(delta, -maxStep, maxStep);

    const next = clamp(x + step, TABLE_X_MIN, TABLE_X_MAX);
    this.paddleVx[slot] = dtS > 0 ? (next - x) / dtS : 0;
    this.paddleX[slot] = next;
  }

  private applyInputForSlot(slot: PlayerIndex, input: TableTennisInput) {
    this.paddleTargetX[slot] = clamp(input.targetX, TABLE_X_MIN, TABLE_X_MAX);
    this.paddleIntentVx[slot] = clamp(input.velX, -PADDLE_MAX_SPEED, PADDLE_MAX_SPEED);
  }

  private slotForPlayerId(playerId: string): PlayerIndex | null {
    if (!playerId) return null;
    if (this.playerIdsByIndex[0] === playerId) return 0;
    if (this.playerIdsByIndex[1] === playerId) return 1;
    return null;
  }
}

export const table_tennisMpAdapter = new TableTennisMultiplayerAdapter();
