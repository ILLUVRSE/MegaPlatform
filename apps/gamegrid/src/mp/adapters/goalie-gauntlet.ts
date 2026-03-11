import { buildShotSchedule, loadShotPatterns } from '../../games/goalie-gauntlet/patterns';
import { buildRankedSchedule } from '../../games/goalie-gauntlet/ranked';
import { applyShotResolution, createMatchState, resolveSaveGrade } from '../../games/goalie-gauntlet/rules';
import { utcDayKey } from '../../games/goalie-gauntlet/challenges';
import type { GoalieDifficulty, GoalieMode, GoalieZone, SaveActionType, SaveGrade } from '../../games/goalie-gauntlet/types';
import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import { normalizePlayers, readEnum, readInputEnvelope, readNumber } from './common';

interface GoalieInput {
  playerIndex?: number;
  t?: number;
  clockOffsetMs?: number;
  targetZone?: GoalieZone;
  gestureType?: 'drag' | 'tap_dive';
  laneX?: number;
  y?: number;
  trigger?: number;
  actionType?: SaveActionType;
  coveredZones?: readonly GoalieZone[];
  holdDurationMs?: number;
}

interface PlayerScore {
  saves: number;
  perfect: number;
  good: number;
  late: number;
  miss: number;
  score: number;
}

interface ShotFeedItem {
  shotId: number;
  zone: GoalieZone;
  gradeByPlayer: Record<string, SaveGrade>;
}

interface GoalieSnapshot {
  tick: number;
  timeMs: number;
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
  phase: 'countdown' | 'live' | 'end';
  seed: number;
  patternId: string;
  shotCursor: number;
  playerScores: Record<string, PlayerScore>;
  lastEventId: number;
  feed: ShotFeedItem[];
}

type GoalieEvent =
  | { type: 'round_start'; eventId: number; seed: number; mode: GoalieMode; patternId: string; startTime: number }
  | {
      type: 'save_result';
      eventId: number;
      shotId: number;
      zone: GoalieZone;
      grades: Record<string, SaveGrade>;
      scoreDelta: Record<string, number>;
      shotTimeMs: number;
    }
  | { type: 'scoreboard_sync'; eventId: number; playerScores: Record<string, PlayerScore>; t: number }
  | { type: 'match_end'; eventId: number; winnerPlayerId: string; playerScores: Record<string, PlayerScore> };

interface GoalieResult {
  winnerPlayerId: string;
  score: Record<string, number>;
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
}

interface PlayerInputState {
  zone: GoalieZone;
  changedAtMs: number;
  gestureType: 'drag' | 'tap_dive';
  actionType: SaveActionType;
  coveredZones?: readonly GoalieZone[];
  holdDurationMs?: number;
}

interface PlayerValidationState {
  diveCooldownUntilMs: number;
  recoveryUntilMs: number;
}

const FEED_LIMIT = 8;
const SCORE_SYNC_EVERY_TICKS = 30;
const LATENCY_CLAMP_MS = 300;
const DIVE_COOLDOWN_MS = 5_000;
const DIVE_MISS_RECOVERY_MS = 620;

function toMode(value: unknown): GoalieMode {
  if (value === 'career') return 'ranked';
  if (value === 'ranked') return 'ranked';
  if (value === 'challenge') return 'challenge';
  if (value === 'time_attack') return 'time_attack';
  return 'survival';
}

function toDifficulty(value: unknown): GoalieDifficulty {
  if (value === 'hard' || value === 'legend') return 'hard';
  if (value === 'medium' || value === 'pro') return 'medium';
  return 'easy';
}

function toZoneFromLaneX(laneX: number | undefined, y: number | undefined): GoalieZone {
  const side = (laneX ?? 0) < 0 ? 'left' : 'right';
  const band = typeof y === 'number' ? (y > 0.33 ? 'low' : y < -0.33 ? 'high' : 'mid') : 'mid';
  return `${band}-${side}` as GoalieZone;
}

function copyScore(score: PlayerScore): PlayerScore {
  return { ...score };
}

function isActionType(value: unknown): value is SaveActionType {
  return value === 'standard' || value === 'poke_check' || value === 'glove_snag' || value === 'desperation_dive';
}

function sanitizeZone(value: unknown): GoalieZone | undefined {
  if (typeof value !== 'string') return undefined;
  if (!/^(high|mid|low)-(left|right)$/.test(value)) return undefined;
  return value as GoalieZone;
}

export class GoalieGauntletMultiplayerAdapter implements MpAdapter<GoalieInput, GoalieSnapshot, GoalieEvent, GoalieResult> {
  readonly isTurnBased = false;

  private role: 'host' | 'client' = 'client';
  private localPlayerId = '';
  private playerIds: string[] = [];

  private started = false;
  private tick = 0;
  private timeMs = 0;
  private phase: 'countdown' | 'live' | 'end' = 'countdown';

  private mode: GoalieMode = 'survival';
  private difficulty: GoalieDifficulty = 'medium';
  private seed = 1;
  private patternId = 'balanced-core';

  private schedule: ReturnType<typeof buildShotSchedule> | null = null;
  private shotCursor = 0;
  private startedEventSent = false;

  private playerScores: Record<string, PlayerScore> = {};
  private inputByPlayer: Record<string, PlayerInputState> = {};
  private matchStateByPlayer: Record<string, ReturnType<typeof createMatchState>> = {};
  private validationByPlayer: Record<string, PlayerValidationState> = {};
  private feed: ShotFeedItem[] = [];

  private lastEventId = 0;
  private outEvents: GoalieEvent[] = [];
  private result: GoalieResult | null = null;

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    this.localPlayerId = context.playerId;
    this.mode = toMode(context.options?.mode);
    this.difficulty = toDifficulty(context.options?.difficulty);
    this.seed = context.seed || 1;

    const normalized = normalizePlayers(context);
    const dynamicPlayers = Array.isArray(context.options?.playerIds)
      ? (context.options?.playerIds as unknown[]).filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];

    this.playerIds = dynamicPlayers.length > 0 ? dynamicPlayers : normalized.playerIdsByIndex.filter((id) => id.length > 0);
    if (!this.playerIds.includes(this.localPlayerId)) {
      this.playerIds.push(this.localPlayerId);
    }

    const patterns = loadShotPatterns();
    if (this.mode === 'ranked') {
      const dayKey = typeof context.options?.dayKey === 'string' && context.options.dayKey.length > 0 ? context.options.dayKey : utcDayKey();
      this.schedule = buildRankedSchedule(patterns, dayKey);
      this.seed = Number.parseInt(dayKey.replace(/-/g, ''), 10) || this.seed;
    } else {
      this.schedule = buildShotSchedule(patterns, {
        seed: this.seed,
        mode: this.mode,
        difficulty: this.difficulty,
        patternId: typeof context.options?.patternId === 'string' ? (context.options?.patternId as string) : undefined,
        shotCount: this.mode === 'time_attack' ? undefined : 70,
        durationMs: this.mode === 'time_attack' ? 60_000 : undefined
      });
    }

    this.patternId = this.schedule.patternId;
    this.resetRoundState();
  }

  onInput(input: GoalieInput): void {
    this.applyInput(this.localPlayerId, input, this.timeMs);
  }

  onRemoteMessage(msg: unknown): void {
    if (this.role !== 'host') {
      const env = readInputEnvelope(msg);
      if (!env) return;
      const sanitized: GoalieInput = {
        playerIndex: typeof env.input.playerIndex === 'number' ? env.input.playerIndex : undefined,
        t: readNumber(env.input.t, this.timeMs),
        clockOffsetMs: readNumber(env.input.clockOffsetMs, 0),
        targetZone: sanitizeZone(env.input.targetZone),
        gestureType: readEnum(env.input.gestureType, ['drag', 'tap_dive'] as const, 'drag'),
        laneX: readNumber(env.input.laneX, 0),
        y: readNumber(env.input.y, 0),
        trigger: readNumber(env.input.trigger, 0),
        actionType: isActionType(env.input.actionType) ? env.input.actionType : undefined,
        coveredZones: Array.isArray(env.input.coveredZones) ? (env.input.coveredZones.filter((z) => sanitizeZone(z)) as GoalieZone[]) : undefined,
        holdDurationMs: readNumber(env.input.holdDurationMs, 0)
      };
      this.applyInput(this.localPlayerId, sanitized, this.timeMs);
      return;
    }

    const env = readInputEnvelope(msg);
    if (!env || typeof env.fromPlayerId !== 'string') return;
    const sanitized: GoalieInput = {
      playerIndex: typeof env.input.playerIndex === 'number' ? env.input.playerIndex : undefined,
      t: readNumber(env.input.t, this.timeMs),
      clockOffsetMs: readNumber(env.input.clockOffsetMs, 0),
      targetZone: sanitizeZone(env.input.targetZone),
      gestureType: readEnum(env.input.gestureType, ['drag', 'tap_dive'] as const, 'drag'),
      laneX: readNumber(env.input.laneX, 0),
      y: readNumber(env.input.y, 0),
      trigger: readNumber(env.input.trigger, 0),
      actionType: isActionType(env.input.actionType) ? env.input.actionType : undefined,
      coveredZones: Array.isArray(env.input.coveredZones) ? (env.input.coveredZones.filter((z) => sanitizeZone(z)) as GoalieZone[]) : undefined,
      holdDurationMs: readNumber(env.input.holdDurationMs, 0)
    };
    this.applyInput(env.fromPlayerId, sanitized, this.timeMs);
  }

  getSnapshot(): GoalieSnapshot {
    const scoreCopy: Record<string, PlayerScore> = {};
    for (let i = 0; i < this.playerIds.length; i += 1) {
      const id = this.playerIds[i];
      scoreCopy[id] = copyScore(this.playerScores[id]);
    }

    return {
      tick: this.tick,
      timeMs: this.timeMs,
      mode: this.mode,
      difficulty: this.difficulty,
      phase: this.phase,
      seed: this.seed,
      patternId: this.patternId,
      shotCursor: this.shotCursor,
      playerScores: scoreCopy,
      lastEventId: this.lastEventId,
      feed: this.feed.slice(0, FEED_LIMIT).map((entry) => ({
        shotId: entry.shotId,
        zone: entry.zone,
        gradeByPlayer: { ...entry.gradeByPlayer }
      }))
    };
  }

  applySnapshot(snapshot: GoalieSnapshot): void {
    this.tick = snapshot.tick;
    this.timeMs = snapshot.timeMs;
    this.mode = snapshot.mode;
    this.difficulty = snapshot.difficulty;
    this.phase = snapshot.phase;
    this.seed = snapshot.seed;
    this.patternId = snapshot.patternId;
    this.shotCursor = snapshot.shotCursor;
    this.lastEventId = snapshot.lastEventId;

    this.playerScores = {};
    for (const [id, score] of Object.entries(snapshot.playerScores)) {
      this.playerScores[id] = copyScore(score);
    }

    this.feed = snapshot.feed.map((entry) => ({
      shotId: entry.shotId,
      zone: entry.zone,
      gradeByPlayer: { ...entry.gradeByPlayer }
    }));
  }

  serializeEvent(event: GoalieEvent): unknown {
    return event;
  }

  applyEvent(event: GoalieEvent): void {
    this.lastEventId = Math.max(this.lastEventId, event.eventId);

    if (event.type === 'round_start') {
      this.phase = 'live';
      return;
    }

    if (event.type === 'save_result') {
      for (const [playerId, grade] of Object.entries(event.grades)) {
        if (!this.playerScores[playerId]) {
          this.playerScores[playerId] = this.emptyScore();
        }
        this.applyGradeToScore(this.playerScores[playerId], grade, event.scoreDelta[playerId] ?? 0);
      }
      this.feed.unshift({ shotId: event.shotId, zone: event.zone, gradeByPlayer: { ...event.grades } });
      if (this.feed.length > FEED_LIMIT) this.feed.length = FEED_LIMIT;
      this.shotCursor = Math.max(this.shotCursor, event.shotId + 1);
      return;
    }

    if (event.type === 'scoreboard_sync') {
      for (const [playerId, score] of Object.entries(event.playerScores)) {
        this.playerScores[playerId] = copyScore(score);
      }
      return;
    }

    if (event.type === 'match_end') {
      this.phase = 'end';
      for (const [playerId, score] of Object.entries(event.playerScores)) {
        this.playerScores[playerId] = copyScore(score);
      }
      const scoreMap: Record<string, number> = {};
      for (const id of Object.keys(this.playerScores)) {
        scoreMap[id] = this.playerScores[id].score;
      }
      this.result = {
        winnerPlayerId: event.winnerPlayerId,
        score: scoreMap,
        mode: this.mode,
        difficulty: this.difficulty
      };
    }
  }

  start(): void {
    this.started = true;
    this.phase = 'countdown';
  }

  stop(): void {
    this.started = false;
  }

  step(dtS: number): GoalieEvent[] {
    this.outEvents = [];
    if (!this.started || this.phase === 'end' || dtS <= 0 || !this.schedule) return this.outEvents;

    this.tick += 1;
    this.timeMs += dtS * 1000;

    if (!this.startedEventSent && this.role === 'host') {
      this.phase = 'live';
      this.startedEventSent = true;
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'round_start',
        eventId: this.lastEventId,
        seed: this.seed,
        mode: this.mode,
        patternId: this.patternId,
        startTime: this.timeMs
      });
    }

    if (this.role !== 'host' || this.phase !== 'live') {
      return this.outEvents;
    }

    while (this.shotCursor < this.schedule.shots.length) {
      const shot = this.schedule.shots[this.shotCursor];
      if (shot.arriveAtMs > this.timeMs) break;

      const grades: Record<string, SaveGrade> = {};
      const scoreDelta: Record<string, number> = {};

      for (let i = 0; i < this.playerIds.length; i += 1) {
        const playerId = this.playerIds[i];
        const input = this.inputByPlayer[playerId] ?? {
          zone: 'mid-left',
          changedAtMs: -100_000,
          gestureType: 'drag',
          actionType: 'standard'
        };

        const resolved = resolveSaveGrade(shot, input, this.difficulty, shot.sequenceIndex);
        const grade = Number.isFinite(resolved.deltaMs) && Math.abs(resolved.deltaMs) <= LATENCY_CLAMP_MS ? resolved.grade : 'MISS';

        if (!this.playerScores[playerId]) {
          this.playerScores[playerId] = this.emptyScore();
        }

        const currentState =
          this.matchStateByPlayer[playerId] ??
          (this.matchStateByPlayer[playerId] = this.createPlayerMatchState());
        const outcome = applyShotResolution(currentState, shot, grade, resolved.deltaMs, resolved.actionType);
        this.matchStateByPlayer[playerId] = outcome.state;

        const delta = outcome.resolution.points;

        grades[playerId] = grade;
        scoreDelta[playerId] = delta;
        this.applyGradeToScore(this.playerScores[playerId], grade, delta);

        if (resolved.actionType === 'desperation_dive' && grade === 'MISS') {
          this.validationByPlayer[playerId].recoveryUntilMs = shot.arriveAtMs + DIVE_MISS_RECOVERY_MS;
        }
      }

      this.feed.unshift({ shotId: shot.id, zone: shot.zone, gradeByPlayer: grades });
      if (this.feed.length > FEED_LIMIT) this.feed.length = FEED_LIMIT;

      this.lastEventId += 1;
      this.outEvents.push({
        type: 'save_result',
        eventId: this.lastEventId,
        shotId: shot.id,
        zone: shot.zone,
        grades,
        scoreDelta,
        shotTimeMs: shot.arriveAtMs
      });

      this.shotCursor += 1;
    }

    if (this.tick % SCORE_SYNC_EVERY_TICKS === 0) {
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'scoreboard_sync',
        eventId: this.lastEventId,
        playerScores: this.copyScores(),
        t: this.timeMs
      });
    }

    const completeByShots = this.shotCursor >= this.schedule.shots.length;
    const completeByTime = this.mode === 'time_attack' && this.timeMs >= 60_000;

    if (completeByShots || completeByTime) {
      this.phase = 'end';
      const winnerPlayerId = this.resolveWinner();
      this.lastEventId += 1;
      this.outEvents.push({
        type: 'match_end',
        eventId: this.lastEventId,
        winnerPlayerId,
        playerScores: this.copyScores()
      });

      const scoreMap: Record<string, number> = {};
      for (const id of Object.keys(this.playerScores)) {
        scoreMap[id] = this.playerScores[id].score;
      }

      this.result = {
        winnerPlayerId,
        score: scoreMap,
        mode: this.mode,
        difficulty: this.difficulty
      };
    }

    return this.outEvents;
  }

  getResult(): GoalieResult | null {
    return this.result;
  }

  private applyInput(playerId: string, input: GoalieInput, hostNowMs: number) {
    if (!playerId) return;
    if (!this.playerIds.includes(playerId)) {
      this.playerIds.push(playerId);
      this.playerScores[playerId] = this.emptyScore();
      this.matchStateByPlayer[playerId] = this.createPlayerMatchState();
      this.validationByPlayer[playerId] = { diveCooldownUntilMs: 0, recoveryUntilMs: 0 };
    }

    const validation = this.validationByPlayer[playerId] ?? (this.validationByPlayer[playerId] = { diveCooldownUntilMs: 0, recoveryUntilMs: 0 });
    if (hostNowMs < validation.recoveryUntilMs) return;

    const zone = input.targetZone ?? toZoneFromLaneX(input.laneX, input.y);
    const inputTime = (input.t ?? hostNowMs) + (input.clockOffsetMs ?? 0);
    const clampedTime = hostNowMs + Math.max(-LATENCY_CLAMP_MS, Math.min(LATENCY_CLAMP_MS, inputTime - hostNowMs));

    const requestedAction: SaveActionType = isActionType(input.actionType) ? input.actionType : 'standard';
    if (requestedAction === 'desperation_dive' && hostNowMs < validation.diveCooldownUntilMs) {
      return;
    }
    if (requestedAction === 'desperation_dive') {
      validation.diveCooldownUntilMs = hostNowMs + DIVE_COOLDOWN_MS;
    }

    this.inputByPlayer[playerId] = {
      zone,
      changedAtMs: clampedTime,
      gestureType: input.gestureType ?? 'drag',
      actionType: requestedAction,
      coveredZones: input.coveredZones,
      holdDurationMs: input.holdDurationMs
    };
  }

  private resetRoundState() {
    this.started = false;
    this.tick = 0;
    this.timeMs = 0;
    this.phase = 'countdown';
    this.shotCursor = 0;
    this.startedEventSent = false;
    this.lastEventId = 0;
    this.outEvents = [];
    this.feed = [];
    this.result = null;

    this.playerScores = {};
    this.inputByPlayer = {};
    this.matchStateByPlayer = {};
    this.validationByPlayer = {};
    for (let i = 0; i < this.playerIds.length; i += 1) {
      const id = this.playerIds[i];
      this.playerScores[id] = this.emptyScore();
      this.matchStateByPlayer[id] = this.createPlayerMatchState();
      this.inputByPlayer[id] = {
        zone: 'mid-left',
        changedAtMs: -100_000,
        gestureType: 'drag',
        actionType: 'standard'
      };
      this.validationByPlayer[id] = { diveCooldownUntilMs: 0, recoveryUntilMs: 0 };
    }
  }

  private emptyScore(): PlayerScore {
    return {
      saves: 0,
      perfect: 0,
      good: 0,
      late: 0,
      miss: 0,
      score: 0
    };
  }

  private applyGradeToScore(score: PlayerScore, grade: SaveGrade, points: number) {
    if (grade === 'MISS') {
      score.miss += 1;
      return;
    }

    score.saves += 1;
    score.score += points;
    if (grade === 'PERFECT') score.perfect += 1;
    else if (grade === 'GOOD') score.good += 1;
    else if (grade === 'LATE') score.late += 1;
  }

  private copyScores(): Record<string, PlayerScore> {
    const copy: Record<string, PlayerScore> = {};
    for (const [id, score] of Object.entries(this.playerScores)) {
      copy[id] = copyScore(score);
    }
    return copy;
  }

  private resolveWinner(): string {
    let winnerId = this.playerIds[0] ?? this.localPlayerId;
    let best = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < this.playerIds.length; i += 1) {
      const id = this.playerIds[i];
      const score = this.playerScores[id]?.score ?? 0;
      if (score > best) {
        best = score;
        winnerId = id;
      }
    }

    return winnerId;
  }

  private createPlayerMatchState(): ReturnType<typeof createMatchState> {
    return createMatchState({
      mode: 'time_attack',
      difficulty: this.difficulty,
      controls: 'drag',
      sensitivity: 'medium',
      options: {
        assistLaneIndicator: true,
        warmup: false,
        haptics: false,
        reducedMotion: false,
        lowQuality: false,
        preLaneIndicator: true
      }
    });
  }
}

export const goalie_gauntletMpAdapter = new GoalieGauntletMultiplayerAdapter();
