import type {
  MpAdapter,
  MpAdapterInitContext,
  MpSpectatorSnapshotOptions,
  MpSpectatorSnapshotPayload
} from '../mpAdapter';
import { createPhysicsScratch, DEFAULT_PHYSICS, stepPixelPuckPhysics } from '../../games/pixelpuck/physics';
import { readInputEnvelope, readNumber } from './common';

export interface PixelPuckInput {
  targetX: number;
  targetY: number;
  seq?: number;
}

export interface PixelPuckSnapshot {
  tick: number;
  puck: { x: number; y: number; vx: number; vy: number };
  paddles: {
    bottom: { x: number; y: number; vx: number; vy: number };
    top: { x: number; y: number; vx: number; vy: number };
  };
  score: { bottom: number; top: number };
  ended: boolean;
  winner: 'bottom' | 'top' | 'none';
}

export interface PixelPuckEvent {
  type: 'goal' | 'match_end' | 'rematch';
  scorer?: 'bottom' | 'top';
  winner?: 'bottom' | 'top' | 'none';
}

export interface PixelPuckSpectatorSnapshot {
  tick: number;
  puck: { x: number; y: number; vx?: number; vy?: number };
  paddles: {
    bottom: { x: number; y: number; vx?: number; vy?: number };
    top: { x: number; y: number; vx?: number; vy?: number };
  };
  score: { bottom: number; top: number };
  ended: boolean;
  winner: 'bottom' | 'top' | 'none';
}

interface PixelPuckResult {
  winner: 'bottom' | 'top' | 'none';
  score: string;
}

interface SimulationState {
  tick: number;
  rolePlayerId: string;
  hostPlayerId: string;
  localInput: PixelPuckInput;
  remoteInput: PixelPuckInput;
  puck: { x: number; y: number; vx: number; vy: number; radius: number };
  bottom: { x: number; y: number; vx: number; vy: number; radius: number };
  top: { x: number; y: number; vx: number; vy: number; radius: number };
  score: { bottom: number; top: number };
  ended: boolean;
  winner: 'bottom' | 'top' | 'none';
  seed: number;
  lastRemoteSeq: number;
  lastRemoteAt: number;
}

const WIDTH = 1280;
const HEIGHT = 720;
const ARENA = { left: 140, right: 1140, top: 64, bottom: 656 };
const GOAL = { x: 500, w: 280 };
const PADDLE_RADIUS = 34;
const MAX_SCORE = 7;
const MP_PHYSICS = { ...DEFAULT_PHYSICS, spinFactor: 0.15, maxSpeed: 1700 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const RINK = {
  id: 'multiplayer',
  name: 'Multiplayer',
  bounds: { x: ARENA.left, y: ARENA.top, width: ARENA.right - ARENA.left, height: ARENA.bottom - ARENA.top },
  goals: {
    top: { x: GOAL.x, width: GOAL.w, lineY: ARENA.top },
    bottom: { x: GOAL.x, width: GOAL.w, lineY: ARENA.bottom }
  },
  obstacles: []
};

function seededNext(seedRef: { value: number }): number {
  let x = seedRef.value | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  seedRef.value = x;
  return ((x >>> 0) % 10_000) / 10_000;
}

function createInitialState(context: MpAdapterInitContext): SimulationState {
  const hostPlayerId = String(context.options?.hostPlayerId ?? context.playerId);
  return {
    tick: 0,
    rolePlayerId: context.playerId,
    hostPlayerId,
    localInput: { targetX: WIDTH * 0.5, targetY: HEIGHT * 0.8 },
    remoteInput: { targetX: WIDTH * 0.5, targetY: HEIGHT * 0.2 },
    puck: { x: WIDTH * 0.5, y: HEIGHT * 0.5, vx: 0, vy: 0, radius: 18 },
    bottom: { x: WIDTH * 0.5, y: HEIGHT * 0.8, vx: 0, vy: 0, radius: 34 },
    top: { x: WIDTH * 0.5, y: HEIGHT * 0.2, vx: 0, vy: 0, radius: 34 },
    score: { bottom: 0, top: 0 },
    ended: false,
    winner: 'none',
    seed: context.seed,
    lastRemoteSeq: -1,
    lastRemoteAt: 0
  };
}

export class PixelPuckMultiplayerAdapter implements MpAdapter<PixelPuckInput, PixelPuckSnapshot, PixelPuckEvent, PixelPuckResult> {
  readonly isTurnBased = false;
  readonly capabilities = {
    spectator: {
      readOnlySnapshots: true as const,
      bandwidthModes: ['full', 'minimal'] as const
    }
  };

  private state: SimulationState | null = null;
  private started = false;
  private physicsScratch = createPhysicsScratch();

  init(context: MpAdapterInitContext): void {
    this.state = createInitialState(context);
    this.started = false;
  }

  onInput(localInput: PixelPuckInput): void {
    if (!this.state) return;
    this.state.localInput = localInput;
  }

  onRemoteMessage(msg: unknown): void {
    if (!this.state) return;
    const env = readInputEnvelope(msg);
    if (!env) return;
    const targetX = readNumber(env.input.targetX, Number.NaN);
    const targetY = readNumber(env.input.targetY, Number.NaN);
    const seq = readNumber(env.input.seq, Number.NaN);
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
    if (Number.isFinite(seq) && seq <= this.state.lastRemoteSeq) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.state.lastRemoteAt < 12) return;
    this.state.lastRemoteAt = now;
    if (Number.isFinite(seq)) this.state.lastRemoteSeq = seq;
    this.state.remoteInput = {
      targetX,
      targetY,
      seq: Number.isFinite(seq) ? seq : undefined
    };
  }

  getSnapshot(): PixelPuckSnapshot {
    if (!this.state) {
      throw new Error('adapter not initialized');
    }

    return {
      tick: this.state.tick,
      puck: { x: this.state.puck.x, y: this.state.puck.y, vx: this.state.puck.vx, vy: this.state.puck.vy },
      paddles: {
        bottom: { x: this.state.bottom.x, y: this.state.bottom.y, vx: this.state.bottom.vx, vy: this.state.bottom.vy },
        top: { x: this.state.top.x, y: this.state.top.y, vx: this.state.top.vx, vy: this.state.top.vy }
      },
      score: { ...this.state.score },
      ended: this.state.ended,
      winner: this.state.winner
    };
  }

  applySnapshot(snapshot: PixelPuckSnapshot): void {
    if (!this.state) return;

    this.state.tick = snapshot.tick;
    this.state.puck = { ...snapshot.puck, radius: this.state.puck.radius ?? 18 };
    this.state.bottom = { ...snapshot.paddles.bottom, radius: this.state.bottom.radius ?? 34 };
    this.state.top = { ...snapshot.paddles.top, radius: this.state.top.radius ?? 34 };
    this.state.score = { ...snapshot.score };
    this.state.ended = snapshot.ended;
    this.state.winner = snapshot.winner;
  }

  getSpectatorSnapshot(
    options?: MpSpectatorSnapshotOptions
  ): MpSpectatorSnapshotPayload<PixelPuckSpectatorSnapshot> {
    const snapshot = this.getSnapshot();
    const bandwidthMode = options?.bandwidthMode ?? 'full';
    if (bandwidthMode === 'minimal') {
      return {
        bandwidthMode,
        snapshot: {
          tick: snapshot.tick,
          puck: { x: snapshot.puck.x, y: snapshot.puck.y },
          paddles: {
            bottom: { x: snapshot.paddles.bottom.x, y: snapshot.paddles.bottom.y },
            top: { x: snapshot.paddles.top.x, y: snapshot.paddles.top.y }
          },
          score: snapshot.score,
          ended: snapshot.ended,
          winner: snapshot.winner
        }
      };
    }

    return {
      bandwidthMode,
      snapshot: {
        tick: snapshot.tick,
        puck: { ...snapshot.puck },
        paddles: {
          bottom: { ...snapshot.paddles.bottom },
          top: { ...snapshot.paddles.top }
        },
        score: snapshot.score,
        ended: snapshot.ended,
        winner: snapshot.winner
      }
    };
  }

  applySpectatorSnapshot(payload: MpSpectatorSnapshotPayload<PixelPuckSpectatorSnapshot>): void {
    const { snapshot } = payload;
    this.applySnapshot({
      tick: snapshot.tick,
      puck: {
        x: snapshot.puck.x,
        y: snapshot.puck.y,
        vx: snapshot.puck.vx ?? 0,
        vy: snapshot.puck.vy ?? 0
      },
      paddles: {
        bottom: {
          x: snapshot.paddles.bottom.x,
          y: snapshot.paddles.bottom.y,
          vx: snapshot.paddles.bottom.vx ?? 0,
          vy: snapshot.paddles.bottom.vy ?? 0
        },
        top: {
          x: snapshot.paddles.top.x,
          y: snapshot.paddles.top.y,
          vx: snapshot.paddles.top.vx ?? 0,
          vy: snapshot.paddles.top.vy ?? 0
        }
      },
      score: snapshot.score,
      ended: snapshot.ended,
      winner: snapshot.winner
    });
  }

  serializeEvent(event: PixelPuckEvent): unknown {
    return event;
  }

  applyEvent(event: PixelPuckEvent): void {
    if (!this.state) return;
    if (event.type === 'goal' && event.scorer) {
      this.state.score[event.scorer] += 1;
      this.state.ended = this.state.score.bottom >= MAX_SCORE || this.state.score.top >= MAX_SCORE;
      this.state.winner = this.state.score.bottom > this.state.score.top ? 'bottom' : this.state.score.top > this.state.score.bottom ? 'top' : 'none';
      return;
    }

    if (event.type === 'match_end') {
      this.state.ended = true;
      this.state.winner = event.winner ?? 'none';
      return;
    }

    if (event.type === 'rematch') {
      this.resetRound();
      this.state.score.bottom = 0;
      this.state.score.top = 0;
      this.state.ended = false;
      this.state.winner = 'none';
    }
  }

  start(): void {
    if (!this.state) {
      throw new Error('adapter not initialized');
    }
    this.started = true;
    this.launchPuck();
  }

  stop(): void {
    this.started = false;
  }

  step(dt: number): PixelPuckEvent[] {
    if (!this.state || !this.started || this.state.ended) return [];

    this.state.tick += 1;

    this.stepPaddle(this.state.bottom, this.state.localInput, dt, true);
    this.stepPaddle(this.state.top, this.state.remoteInput, dt, false);

    stepPixelPuckPhysics(this.state.puck, { bottom: this.state.bottom, top: this.state.top }, RINK, dt, MP_PHYSICS, this.physicsScratch, false);

    const events: PixelPuckEvent[] = [];
    if (this.physicsScratch.goal === 'bottom') {
      this.state.score.bottom += 1;
      events.push({ type: 'goal', scorer: 'bottom' });
      this.resetRound();
    } else if (this.physicsScratch.goal === 'top') {
      this.state.score.top += 1;
      events.push({ type: 'goal', scorer: 'top' });
      this.resetRound();
    }

    if (this.state.score.bottom >= MAX_SCORE || this.state.score.top >= MAX_SCORE) {
      this.state.ended = true;
      this.state.winner = this.state.score.bottom > this.state.score.top ? 'bottom' : 'top';
      events.push({ type: 'match_end', winner: this.state.winner });
    }

    return events;
  }

  getResult(): PixelPuckResult | null {
    if (!this.state || !this.state.ended) return null;
    return {
      winner: this.state.winner,
      score: `${this.state.score.bottom}-${this.state.score.top}`
    };
  }

  private stepPaddle(
    paddle: SimulationState['bottom'],
    input: PixelPuckInput,
    dt: number,
    bottomHalf: boolean
  ) {
    const maxSpeed = 1250;
    const accel = 2900;

    const dx = input.targetX - paddle.x;
    const dy = input.targetY - paddle.y;

    const targetVx = clamp(dx * 10, -maxSpeed, maxSpeed);
    const targetVy = clamp(dy * 10, -maxSpeed, maxSpeed);

    const ax = clamp((targetVx - paddle.vx) / dt, -accel, accel);
    const ay = clamp((targetVy - paddle.vy) / dt, -accel, accel);

    paddle.vx += ax * dt;
    paddle.vy += ay * dt;

    const speed = Math.hypot(paddle.vx, paddle.vy);
    if (speed > maxSpeed) {
      const ratio = maxSpeed / speed;
      paddle.vx *= ratio;
      paddle.vy *= ratio;
    }

    paddle.x += paddle.vx * dt;
    paddle.y += paddle.vy * dt;

    const minX = ARENA.left + PADDLE_RADIUS;
    const maxX = ARENA.right - PADDLE_RADIUS;
    const laneMid = (ARENA.top + ARENA.bottom) * 0.5;

    const minY = bottomHalf ? laneMid + PADDLE_RADIUS : ARENA.top + PADDLE_RADIUS;
    const maxY = bottomHalf ? ARENA.bottom - PADDLE_RADIUS : laneMid - PADDLE_RADIUS;

    paddle.x = clamp(paddle.x, minX, maxX);
    paddle.y = clamp(paddle.y, minY, maxY);
  }

  private launchPuck() {
    if (!this.state) return;
    const seedRef = { value: this.state.seed };
    const angle = (seededNext(seedRef) - 0.5) * 0.8;
    const direction = seededNext(seedRef) > 0.5 ? 1 : -1;
    const speed = 700;
    this.state.seed = seedRef.value;
    this.state.puck.vx = Math.sin(angle) * speed;
    this.state.puck.vy = Math.cos(angle) * speed * direction;
  }

  private resetRound() {
    if (!this.state) return;
    this.state.puck.x = WIDTH * 0.5;
    this.state.puck.y = HEIGHT * 0.5;
    this.state.puck.vx = 0;
    this.state.puck.vy = 0;
    this.state.puck.radius = 18;
    this.state.bottom.x = WIDTH * 0.5;
    this.state.bottom.y = HEIGHT * 0.8;
    this.state.bottom.vx = 0;
    this.state.bottom.vy = 0;
    this.state.bottom.radius = 34;
    this.state.top.x = WIDTH * 0.5;
    this.state.top.y = HEIGHT * 0.2;
    this.state.top.vx = 0;
    this.state.top.vy = 0;
    this.state.top.radius = 34;
    this.launchPuck();
  }
}
