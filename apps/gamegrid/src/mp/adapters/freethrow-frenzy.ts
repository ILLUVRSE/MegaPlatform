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

type FreethrowMode = 'classic' | 'timed' | 'streak' | 'horse';

type ShotSpot = 'free_throw' | 'midrange' | 'three_point' | 'corner';

interface FreethrowInput {
  playerIndex?: number;
  aim: number;
  power: number;
  meterPhase: number;
  pressure: number;
  spot: ShotSpot;
}

interface FreethrowSnapshot {
  mode: FreethrowMode;
  phase: 'live' | 'end';
  turn: PlayerIndex;
  shotsTaken: number;
  maxShots: number;
  score: { p0: number; p1: number };
  streaks: { p0: number; p1: number };
  made: { p0: number; p1: number };
  lastEventId: number;
}

type FreethrowEvent =
  | {
      type: 'shot_result';
      eventId: number;
      player: PlayerIndex;
      made: boolean;
      score: { p0: number; p1: number };
      streaks: { p0: number; p1: number };
      shotsTaken: number;
      turn: PlayerIndex;
      quality: number;
      points: number;
      spot: ShotSpot;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { p0: number; p1: number }; made: { p0: number; p1: number } };

interface FreethrowResult {
  winner: 'p0' | 'p1' | 'none';
  mode: FreethrowMode;
  score: string;
}

function toMode(value: unknown): FreethrowMode {
  if (value === 'timed') return 'timed';
  if (value === 'streak') return 'streak';
  if (value === 'horse') return 'horse';
  return 'classic';
}

function toSpot(value: unknown): ShotSpot {
  if (value === 'midrange') return 'midrange';
  if (value === 'three_point') return 'three_point';
  if (value === 'corner') return 'corner';
  return 'free_throw';
}

function spotPoints(spot: ShotSpot): number {
  if (spot === 'three_point' || spot === 'corner') return 3;
  if (spot === 'midrange') return 2;
  return 1;
}

function modeBonus(mode: FreethrowMode, streak: number): number {
  if (mode === 'streak') return Math.min(3, Math.floor(streak / 2));
  if (mode === 'timed') return 1;
  return 0;
}

export class FreethrowFrenzyMultiplayerAdapter
  implements MpAdapter<FreethrowInput, FreethrowSnapshot, FreethrowEvent, FreethrowResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: FreethrowMode = 'classic';
  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private shotsTaken = 0;
  private maxShots = 20;

  private score = new Uint16Array(2);
  private streaks = new Uint8Array(2);
  private made = new Uint16Array(2);
  private lastEventId = 0;
  private result: FreethrowResult | null = null;

  private pending: Array<{ player: PlayerIndex; input: FreethrowInput }> = [];
  private outEvents: FreethrowEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: FreethrowInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const aim = readNumber(env.input.aim, Number.NaN);
    const power = readNumber(env.input.power, Number.NaN);
    if (!Number.isFinite(aim) || !Number.isFinite(power)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    const meterPhase = readNumber(env.input.meterPhase, 0.5);
    const pressure = readNumber(env.input.pressure, 0);
    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        aim: clamp(aim, -1, 1),
        power: clamp(power, 0.08, 1),
        meterPhase: clamp(meterPhase, 0, 1),
        pressure: clamp(pressure, 0, 1),
        spot: toSpot(env.input.spot)
      }
    });
  }

  getSnapshot(): FreethrowSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      turn: this.turn,
      shotsTaken: this.shotsTaken,
      maxShots: this.maxShots,
      score: { p0: this.score[0], p1: this.score[1] },
      streaks: { p0: this.streaks[0], p1: this.streaks[1] },
      made: { p0: this.made[0], p1: this.made[1] },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: FreethrowSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.shotsTaken = snapshot.shotsTaken;
    this.maxShots = snapshot.maxShots;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.streaks[0] = snapshot.streaks.p0;
    this.streaks[1] = snapshot.streaks.p1;
    this.made[0] = snapshot.made.p0;
    this.made[1] = snapshot.made.p1;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: FreethrowEvent): unknown {
    return event;
  }

  applyEvent(event: FreethrowEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'shot_result') {
      this.turn = event.turn;
      this.shotsTaken = event.shotsTaken;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      this.streaks[0] = event.streaks.p0;
      this.streaks[1] = event.streaks.p1;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
    this.made[0] = event.made.p0;
    this.made[1] = event.made.p1;
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

  step(): FreethrowEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;

    const timing = 1 - Math.abs(clamp(action.input.meterPhase, 0, 1) - 0.5) * 2;
    const aimScore = 1 - Math.abs(clamp(action.input.aim, -1, 1)) * 0.8;
    const powerScore = 1 - Math.abs(clamp(action.input.power, 0.08, 1) - 0.68) * 1.2;
    const pressurePenalty = clamp(action.input.pressure, 0, 1) * 0.16;
    const spotDifficulty = action.input.spot === 'free_throw' ? 0 : action.input.spot === 'midrange' ? 0.06 : 0.12;
    const jitter = (seedStep(this.seedRef) - 0.5) * 0.13;

    const quality = clamp(aimScore * 0.34 + powerScore * 0.3 + timing * 0.3 + jitter - pressurePenalty - spotDifficulty, 0, 1);
    const made = quality >= 0.56;

    if (made) {
      const basePoints = spotPoints(action.input.spot);
      const bonus = modeBonus(this.mode, this.streaks[action.player]);
      this.score[action.player] += basePoints + bonus;
      this.streaks[action.player] += 1;
      this.made[action.player] += 1;
    } else {
      this.streaks[action.player] = 0;
    }

    this.shotsTaken += 1;
    this.turn = this.turn === 0 ? 1 : 0;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'shot_result',
      eventId: this.lastEventId,
      player: action.player,
      made,
      score: { p0: this.score[0], p1: this.score[1] },
      streaks: { p0: this.streaks[0], p1: this.streaks[1] },
      shotsTaken: this.shotsTaken,
      turn: this.turn,
      quality,
      points: made ? spotPoints(action.input.spot) : 0,
      spot: action.input.spot
    });

    if (this.shotsTaken >= this.maxShots) {
      const winner: PlayerIndex = this.score[0] >= this.score[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winner,
        score: { p0: this.score[0], p1: this.score[1] },
        made: { p0: this.made[0], p1: this.made[1] }
      });

      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): FreethrowResult | null {
    return this.result;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.shotsTaken = 0;
    this.maxShots = this.mode === 'timed' ? 24 : this.mode === 'horse' ? 18 : 20;
    this.score[0] = 0;
    this.score[1] = 0;
    this.streaks[0] = 0;
    this.streaks[1] = 0;
    this.made[0] = 0;
    this.made[1] = 0;
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const freethrow_frenzyMpAdapter = new FreethrowFrenzyMultiplayerAdapter();
