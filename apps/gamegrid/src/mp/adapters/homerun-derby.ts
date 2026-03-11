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

type HomerunMode = 'standard' | 'power' | 'sudden';

interface HomerunInput {
  playerIndex?: number;
  swingTiming: number;
  swingPower: number;
}

interface HomerunSnapshot {
  mode: HomerunMode;
  phase: 'live' | 'end';
  turn: PlayerIndex;
  pitchesTaken: number;
  maxPitches: number;
  score: { p0: number; p1: number };
  homeruns: { p0: number; p1: number };
  lastEventId: number;
}

type HomerunEvent =
  | {
      type: 'pitch_result';
      eventId: number;
      player: PlayerIndex;
      homerun: boolean;
      awarded: number;
      score: { p0: number; p1: number };
      pitchesTaken: number;
      turn: PlayerIndex;
    }
  | { type: 'match_end'; eventId: number; winner: PlayerIndex; score: { p0: number; p1: number } };

interface HomerunResult {
  winner: 'p0' | 'p1' | 'none';
  mode: HomerunMode;
  score: string;
}

function toMode(value: unknown): HomerunMode {
  if (value === 'power') return 'power';
  if (value === 'sudden') return 'sudden';
  return 'standard';
}

export class HomerunDerbyMultiplayerAdapter
  implements MpAdapter<HomerunInput, HomerunSnapshot, HomerunEvent, HomerunResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerIdsByIndex: [string, string] = ['', ''];
  private localPlayerIndex = -1;
  private seedRef = { value: 1 };

  private mode: HomerunMode = 'standard';
  private phase: 'live' | 'end' = 'live';
  private turn: PlayerIndex = 0;
  private pitchesTaken = 0;
  private maxPitches = 12;

  private score = new Uint16Array(2);
  private homeruns = new Uint8Array(2);
  private lastEventId = 0;
  private result: HomerunResult | null = null;

  private pending: Array<{ player: PlayerIndex; input: HomerunInput }> = [];
  private outEvents: HomerunEvent[] = [];

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    const players = normalizePlayers(context);
    this.playerIdsByIndex = players.playerIdsByIndex;
    this.localPlayerIndex = players.localPlayerIndex;
    this.seedRef.value = context.seed || 1;
    this.mode = toMode(context.options?.mode);
    this.reset();
  }

  onInput(localInput: HomerunInput): void {
    const slot = safePlayerIndex(this.localPlayerIndex);
    if (slot === null) return;
    this.pending.push({ player: slot, input: localInput });
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') return;

    const env = readInputEnvelope(msg);
    if (!env) return;
    const swingTiming = readNumber(env.input.swingTiming, Number.NaN);
    const swingPower = readNumber(env.input.swingPower, Number.NaN);
    if (!Number.isFinite(swingTiming) || !Number.isFinite(swingPower)) return;

    const byIdentity = typeof env.fromPlayerId === 'string' ? resolveSlotByPlayerId(this.playerIdsByIndex, env.fromPlayerId) : null;
    const byPayload = safePlayerIndex(env.input.playerIndex);
    const slot = byIdentity ?? byPayload;
    if (slot === null) return;

    this.pending.push({
      player: slot,
      input: {
        playerIndex: byPayload ?? undefined,
        swingTiming: clamp(swingTiming, 0, 1),
        swingPower: clamp(swingPower, 0, 1)
      }
    });
  }

  getSnapshot(): HomerunSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      turn: this.turn,
      pitchesTaken: this.pitchesTaken,
      maxPitches: this.maxPitches,
      score: { p0: this.score[0], p1: this.score[1] },
      homeruns: { p0: this.homeruns[0], p1: this.homeruns[1] },
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: HomerunSnapshot): void {
    this.mode = snapshot.mode;
    this.phase = snapshot.phase;
    this.turn = snapshot.turn;
    this.pitchesTaken = snapshot.pitchesTaken;
    this.maxPitches = snapshot.maxPitches;
    this.score[0] = snapshot.score.p0;
    this.score[1] = snapshot.score.p1;
    this.homeruns[0] = snapshot.homeruns.p0;
    this.homeruns[1] = snapshot.homeruns.p1;
    this.lastEventId = snapshot.lastEventId;
  }

  serializeEvent(event: HomerunEvent): unknown {
    return event;
  }

  applyEvent(event: HomerunEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'pitch_result') {
      this.turn = event.turn;
      this.pitchesTaken = event.pitchesTaken;
      this.score[0] = event.score.p0;
      this.score[1] = event.score.p1;
      return;
    }

    this.phase = 'end';
    this.score[0] = event.score.p0;
    this.score[1] = event.score.p1;
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

  step(): HomerunEvent[] {
    this.outEvents = [];
    if (this.role !== 'host' || this.phase === 'end') return this.outEvents;

    const action = this.pending.shift();
    if (!action || action.player !== this.turn) return this.outEvents;

    const timingDiff = Math.abs(clamp(action.input.swingTiming, 0, 1) - 0.5);
    const power = clamp(action.input.swingPower, 0, 1);
    const variance = (seedStep(this.seedRef) - 0.5) * 0.16;
    const contact = 1 - timingDiff * 1.4 + variance;
    const homerun = contact + power * 0.65 >= (this.mode === 'sudden' ? 1.05 : 0.95);

    const awarded = homerun ? Math.round(2 + power * 3) : Math.max(0, Math.round((contact + power) * 2));
    this.score[action.player] += awarded;
    if (homerun) this.homeruns[action.player] += 1;

    this.pitchesTaken += 1;
    this.turn = this.turn === 0 ? 1 : 0;

    this.lastEventId += 1;
    this.outEvents.push({
      type: 'pitch_result',
      eventId: this.lastEventId,
      player: action.player,
      homerun,
      awarded,
      score: { p0: this.score[0], p1: this.score[1] },
      pitchesTaken: this.pitchesTaken,
      turn: this.turn
    });

    if (this.pitchesTaken >= this.maxPitches) {
      const winner: PlayerIndex = this.score[0] >= this.score[1] ? 0 : 1;
      this.phase = 'end';
      this.lastEventId += 1;
      this.outEvents.push({ type: 'match_end', eventId: this.lastEventId, winner, score: { p0: this.score[0], p1: this.score[1] } });
      this.result = {
        winner: winner === 0 ? 'p0' : 'p1',
        mode: this.mode,
        score: `${this.score[0]}-${this.score[1]}`
      };
    }

    return this.outEvents;
  }

  getResult(): HomerunResult | null {
    return this.result;
  }

  private reset() {
    this.phase = 'live';
    this.turn = 0;
    this.pitchesTaken = 0;
    this.maxPitches = this.mode === 'sudden' ? 10 : 12;
    this.score[0] = 0;
    this.score[1] = 0;
    this.homeruns[0] = 0;
    this.homeruns[1] = 0;
    this.lastEventId = 0;
    this.result = null;
    this.pending = [];
  }
}

export const homerun_derbyMpAdapter = new HomerunDerbyMultiplayerAdapter();
