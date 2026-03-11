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

type PoolMode = '8-ball' | '9-ball';

interface PoolInput {
  playerIndex?: number;
  cueAngle: number;
  cuePower: number;
  calledPocket: number;
}

interface PoolSnapshot {
  mode: PoolMode;
  phase: 'live' | 'end';
  turn: PlayerIndex;
  inning: number;
  fouls: { p0: number; p1: number };
  pocketed: { p0: number; p1: number };
  ballsRemaining: number;
  cueBall: { x: number; y: number };
  lastEventId: number;
}

type PoolEvent =
  | {
      type: 'shot_end';
      eventId: number;
      player: PlayerIndex;
      foul: boolean;
      pocketedThisShot: number;
      turn: PlayerIndex;
      inning: number;
      fouls: { p0: number; p1: number };
      pocketed: { p0: number; p1: number };
      ballsRemaining: number;
      cueBall: { x: number; y: number };
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; pocketed: { p0: number; p1: number } };

interface PoolResult {
  winner: 'p0' | 'p1' | 'none';
  mode: PoolMode;
  score: string;
}

function toMode(value: unknown): PoolMode {
  return value === '9-ball' ? '9-ball' : '8-ball';
}

export class PoolMultiplayerAdapter implements MpAdapter<PoolInput, PoolSnapshot, PoolEvent, PoolResult> {
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: PoolMode = '8-ball';
  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private inning = 1;

  private fouls = new Uint8Array(2);
  private pocketed = new Uint8Array(2);
  private ballsRemaining = 15;
  private cueBall = { x: 0, y: 0 };

  private lastEventId = 0;
  private result: PoolResult | null = null;
  private pending: Array<{ player: PlayerIndex; input: PoolInput }> = [];
  private outEvents: PoolEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: PoolInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const cuePower = readNumber(env.input.cuePower, Number.NaN);
    const cueAngle = readNumber(env.input.cueAngle, Number.NaN);
    const calledPocket = readNumber(env.input.calledPocket, Number.NaN);
    if (!Number.isFinite(cuePower) || !Number.isFinite(cueAngle) || !Number.isFinite(calledPocket)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        cuePower: clamp(cuePower, 0, 1),
        cueAngle: clamp(cueAngle, -Math.PI, Math.PI),
        calledPocket: clamp(Math.round(calledPocket), 0, 5)
      }
    });
  }

  getSnapshot(): PoolSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      turn: this.turn,
      inning: this.inning,
      fouls: { p0: this.fouls[0], p1: this.fouls[1] },
      pocketed: { p0: this.pocketed[0], p1: this.pocketed[1] },
      ballsRemaining: this.ballsRemaining,
      cueBall: { ...this.cueBall },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: PoolSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.inning = snapshot.inning;
    this.fouls[0] = snapshot.fouls.p0;
    this.fouls[1] = snapshot.fouls.p1;
    this.pocketed[0] = snapshot.pocketed.p0;
    this.pocketed[1] = snapshot.pocketed.p1;
    this.ballsRemaining = snapshot.ballsRemaining;
    this.cueBall = { ...snapshot.cueBall };
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: PoolEvent): unknown {
    return event;
  }

  applyEvent(event: PoolEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'shot_end') {
      this.turn = event.turn;
      this.inning = event.inning;
      this.fouls[0] = event.fouls.p0;
      this.fouls[1] = event.fouls.p1;
      this.pocketed[0] = event.pocketed.p0;
      this.pocketed[1] = event.pocketed.p1;
      this.ballsRemaining = event.ballsRemaining;
      this.cueBall = { ...event.cueBall };
      return;
    }

    this.phase = 'end';
    this.pocketed[0] = event.pocketed.p0;
    this.pocketed[1] = event.pocketed.p1;
    this.result = {
      winner: event.winner === 0 ? 'p0' : 'p1',
      mode: this.mode,
      score: `${event.pocketed.p0}-${event.pocketed.p1}`
    };
  }

  start(): void {
    this.phase = 'live';
  }

  stop(): void {
    this.phase = 'end';
  }

  step(): PoolEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;

    const shotPower = clamp(action.input.cuePower, 0, 1);
    const angle = clamp(action.input.cueAngle, -Math.PI, Math.PI);

    const randomPocket = Math.floor(seedStep(this.seedRef) * 3);
    const pocketedThisShot = Math.max(0, Math.round(shotPower * 2 + randomPocket - (Math.abs(angle) > 2.2 ? 1 : 0)));
    const foul = shotPower < 0.12 || (Math.abs(angle) > 2.8 && shotPower > 0.8);

    if (foul) {
      this.fouls[action.player] += 1;
    } else if (pocketedThisShot > 0) {
      this.pocketed[action.player] += pocketedThisShot;
      this.ballsRemaining = Math.max(0, this.ballsRemaining - pocketedThisShot);
    }

    this.cueBall = {
      x: clamp(Math.cos(angle) * shotPower * 240, -320, 320),
      y: clamp(Math.sin(angle) * shotPower * 120, -180, 180)
    };

    const keepsTurn = !foul && pocketedThisShot > 0;
    if (!keepsTurn) {
      this.turn = this.turn === 0 ? 1 : 0;
      this.inning += 1;
    }

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'shot_end',
      eventId: this.lastEventId,
      player: action.player,
      foul,
      pocketedThisShot,
      turn: this.turn,
      inning: this.inning,
      fouls: { p0: this.fouls[0], p1: this.fouls[1] },
      pocketed: { p0: this.pocketed[0], p1: this.pocketed[1] },
      ballsRemaining: this.ballsRemaining,
      cueBall: { ...this.cueBall }
    });

    if (this.ballsRemaining <= (this.mode === '9-ball' ? 6 : 0) || this.inning > 20) {
      const winner: PlayerIndex = this.pocketed[0] >= this.pocketed[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({ type: 'match_end', eventId: this.lastEventId, winner, pocketed: { p0: this.pocketed[0], p1: this.pocketed[1] } });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        score: `${this.pocketed[0]}-${this.pocketed[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): PoolResult | null {
    return this.result;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.inning = 1;
    this.fouls[0] = 0;
    this.fouls[1] = 0;
    this.pocketed[0] = 0;
    this.pocketed[1] = 0;
    this.ballsRemaining = this.mode === '9-ball' ? 9 : 15;
    this.cueBall = { x: 0, y: 0 };
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const poolMpAdapter = new PoolMultiplayerAdapter();
