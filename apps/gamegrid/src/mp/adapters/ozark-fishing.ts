import type { MpAdapter, MpAdapterInitContext } from '../mpAdapter';
import { clamp, readInputEnvelope } from './common';
import { getSeasonForDate, isoWeekKey, loadSeasonCatalog, loadWeeklyEvents, pickWeeklyEvent } from '../../games/ozark-fishing/liveops';
import { pushTournamentHistory } from '../../games/ozark-fishing/tournament/history';
import {
  completeCurrentMatch,
  createTournamentState,
  currentMatchAssignment,
  startTournament
} from '../../games/ozark-fishing/tournament/tournament';
import type {
  MatchPlayerScore,
  TournamentConfig,
  TournamentFormat,
  TournamentMatchAssignment,
  TournamentState
} from '../../games/ozark-fishing/tournament/types';

type PartyMode = 'derby' | 'big_catch';
type GearFairness = 'standardized' | 'personal';
type SpotId = 'cove' | 'dock' | 'open-water' | 'river-mouth';
type SessionPhase = 'waiting' | 'live' | 'ended';
type PlayerPhase = 'idle' | 'lure' | 'bite_window' | 'hooked' | 'reeling' | 'cooldown' | 'spectator';
type HookQuality = 'poor' | 'good' | 'perfect';
type Weather = 'sunny' | 'overcast' | 'light_rain';
type TimeOfDay = 'day' | 'night';
type EscapeReason = 'missed_hook' | 'invalid_hook' | 'slack' | 'line_snap';

interface OzarkFishDef {
  id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  minWeight: number;
  maxWeight: number;
  difficulty: number;
}

interface PlannedFish {
  fishId: string;
  rarity: OzarkFishDef['rarity'];
  weight: number;
  stamina: number;
  aggression: number;
}

interface PlayerRuntime {
  playerId: string;
  phase: PlayerPhase;
  totalWeight: number;
  bestFish: number;
  bestFishAtMs: number;
  firstCatchAtMs: number;
  lastCatchAtMs: number;
  catches: number;
  xp: number;
  onHookFishId: string | null;
  biteWindowStartMs: number;
  biteWindowEndMs: number;
  plannedBiteAtMs: number;
  lureId: string;
  hookQuality: HookQuality | null;
  reelStrength: number;
  reelActive: boolean;
  tension: number;
  stamina: number;
  lineTightness: number;
  notReelingMs: number;
  slackMs: number;
  cooldownUntilMs: number;
  plannedFish: PlannedFish | null;
  lastCastMs: number;
  lastHookMs: number;
  lastReelMs: number;
  gearProfile: {
    drag: number;
    rodFlex: number;
    snapThreshold: number;
    slackRecovery: number;
  };
}

interface CatchFeedItem {
  playerId: string;
  fishId: string;
  rarity: OzarkFishDef['rarity'];
  weight: number;
  timeMs: number;
}

interface LeaderboardEntry {
  playerId: string;
  totalWeight: number;
  bestFish: number;
  bestFishAtMs: number;
  catches: number;
  xp: number;
  rank: number;
}

interface OzarkInput {
  type?: 'cast' | 'hookAttempt' | 'reelInput' | 'checksum_mismatch';
  playerId?: string;
  timestamp?: number;
  cast?: {
    aim: number;
    power: number;
    lureId: string;
  };
  reel?: {
    action: 'start' | 'stop' | 'strength';
    strength?: number;
  };
  checksum?: number;

  x?: number;
  y?: number;
  pressed?: boolean;
  playerIndex?: number;
}

interface OzarkSnapshot {
  sessionId: string;
  seed: number;
  mode: PartyMode;
  weather: Weather;
  timeOfDay: TimeOfDay;
  assistAllowed: boolean;
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  phase: SessionPhase;
  players: Array<{
    playerId: string;
    phase: PlayerPhase;
    totalWeight: number;
    bestFish: number;
    bestFishAtMs: number;
    catches: number;
    xp: number;
    tension: number;
    lineTightness: number;
    onHookFishId: string | null;
  }>;
  leaderboard: LeaderboardEntry[];
  catchFeed: CatchFeedItem[];
  checksum: number;
  checksumTick: number;
  sessionConfig: {
    mode: PartyMode;
    durationSec: number;
    weather: Weather;
    timeOfDay: TimeOfDay;
    assistAllowed: boolean;
    spotId: SpotId;
    gearFairness: GearFairness;
    rarityMultipliers: boolean;
    seasonId: string;
    weekKey: string;
    eventId: string | null;
    useWeeklyEvent: boolean;
    iceFishing?: boolean;
    tournamentMode?: boolean;
    tournamentFormat?: TournamentFormat;
    tournamentMatchType?: PartyMode;
    tournamentDurationSec?: number;
    tournamentName?: string;
  };
  tournament?: {
    id: string;
    phase: TournamentState['phase'];
    format: TournamentFormat;
    activeMatchId: string | null;
    assignment: TournamentMatchAssignment | null;
    standings: string[];
    bracket?: TournamentState['bracket'];
    league?: TournamentState['league'];
  };
  lastEventId: number;
}

type OzarkEvent =
  | {
      type: 'biteWindowStart';
      eventId: number;
      playerId: string;
      windowMs: number;
      fishHint: string;
      tMs: number;
    }
  | {
      type: 'hookResult';
      eventId: number;
      playerId: string;
      quality: HookQuality;
      fishId: string;
      staminaSeed: number;
      tMs: number;
    }
  | {
      type: 'catchResult';
      eventId: number;
      playerId: string;
      fishId: string;
      rarity: OzarkFishDef['rarity'];
      weight: number;
      xp: number;
      timeMs: number;
    }
  | {
      type: 'escapeResult';
      eventId: number;
      playerId: string;
      reason: EscapeReason;
      tMs: number;
    }
  | {
      type: 'inputRejected';
      eventId: number;
      playerId: string;
      reason: string;
      tMs: number;
    }
  | {
      type: 'state_checksum';
      eventId: number;
      checksum: number;
      tMs: number;
    }
  | {
      type: 'state_resync';
      eventId: number;
      snapshot: OzarkSnapshot;
      tMs: number;
    }
  | {
      type: 'sessionEnd';
      eventId: number;
      leaderboard: LeaderboardEntry[];
      tMs: number;
    }
  | {
      type: 'tournament_create';
      eventId: number;
      config: TournamentConfig;
      roster: string[];
      seedOrder: string[];
      tMs: number;
    }
  | {
      type: 'tournament_start';
      eventId: number;
      bracketState?: TournamentState['bracket'];
      leagueState?: TournamentState['league'];
      tMs: number;
    }
  | {
      type: 'match_assign';
      eventId: number;
      matchId: string;
      players: string[];
      spectators: string[];
      tMs: number;
    }
  | {
      type: 'match_result';
      eventId: number;
      matchId: string;
      standings: MatchPlayerScore[];
      tieBreakData: {
        primary: number;
        secondary: number;
        tertiary: number;
        rule: string;
      };
      tMs: number;
    }
  | {
      type: 'tournament_advance';
      eventId: number;
      updatedState: {
        phase: TournamentState['phase'];
        activeMatchId: string | null;
        finalStandings: string[];
      };
      tMs: number;
    }
  | {
      type: 'tournament_end';
      eventId: number;
      finalStandings: string[];
      tMs: number;
    };

interface OzarkResult {
  mode: PartyMode;
  winnerPlayerId: string | null;
  leaderboard: LeaderboardEntry[];
}

const MAX_PLAYERS = 16;
const RECONNECT_GRACE_MS = 60_000;
const CHECKSUM_INTERVAL_STEPS = 60;

const FISH_TABLE: OzarkFishDef[] = [
  { id: 'largemouth-bass', rarity: 'common', minWeight: 1.5, maxWeight: 8.4, difficulty: 1.1 },
  { id: 'smallmouth-bass', rarity: 'common', minWeight: 1.2, maxWeight: 6.7, difficulty: 1.2 },
  { id: 'bluegill', rarity: 'common', minWeight: 0.3, maxWeight: 1.4, difficulty: 0.8 },
  { id: 'catfish', rarity: 'uncommon', minWeight: 2.1, maxWeight: 14.5, difficulty: 1.35 },
  { id: 'crappie', rarity: 'uncommon', minWeight: 0.6, maxWeight: 2.8, difficulty: 0.95 },
  { id: 'walleye', rarity: 'rare', minWeight: 1.8, maxWeight: 10.2, difficulty: 1.25 },
  { id: 'carp', rarity: 'rare', minWeight: 4.2, maxWeight: 19.4, difficulty: 1.45 },
  { id: 'ozark-muskie', rarity: 'legendary', minWeight: 12.5, maxWeight: 32, difficulty: 1.9 }
];

const RARITY_MULTIPLIER: Record<OzarkFishDef['rarity'], number> = {
  common: 1,
  uncommon: 1.1,
  rare: 1.25,
  legendary: 1.45
};

const ALLOWED_LURES = ['spinnerbait', 'topwater-pop', 'jig', 'crankbait', 'soft-worm', 'deep-diver'] as const;

function rarityWeight(rarity: OzarkFishDef['rarity']): number {
  if (rarity === 'legendary') return 0.03;
  if (rarity === 'rare') return 0.18;
  if (rarity === 'uncommon') return 0.32;
  return 1;
}

function normalizeMode(value: unknown): PartyMode {
  return value === 'big_catch' || value === 'big-catch' ? 'big_catch' : 'derby';
}

function normalizeDurationSec(value: unknown): number {
  const n = Number(value);
  if (n === 180 || n === 300 || n === 480) return n;
  if (n === 3 || n === 5 || n === 8) return n * 60;
  return 300;
}

function normalizeWeather(value: unknown, rand: () => number): Weather {
  if (value === 'sunny' || value === 'overcast' || value === 'light_rain') return value;
  if (value === 'random') {
    const pick = rand();
    if (pick < 0.34) return 'sunny';
    if (pick < 0.67) return 'overcast';
    return 'light_rain';
  }
  return 'sunny';
}

function normalizeTime(value: unknown, rand: () => number): TimeOfDay {
  if (value === 'day' || value === 'night') return value;
  if (value === 'random') return rand() < 0.5 ? 'day' : 'night';
  return 'day';
}

function normalizeSpot(value: unknown, rand: () => number): SpotId {
  if (value === 'cove' || value === 'dock' || value === 'open-water' || value === 'river-mouth') return value;
  if (value === 'random') {
    const pick = rand();
    if (pick < 0.25) return 'cove';
    if (pick < 0.5) return 'dock';
    if (pick < 0.75) return 'open-water';
    return 'river-mouth';
  }
  return 'cove';
}

function normalizeGearFairness(value: unknown): GearFairness {
  return value === 'personal' ? 'personal' : 'standardized';
}

function normalizeRarityMultipliers(value: unknown): boolean {
  return value === true;
}

function normalizeTournamentFormat(value: unknown): TournamentFormat {
  return value === 'league' ? 'league' : 'bracket';
}

function normalizeTournamentDuration(value: unknown): number {
  const n = Number(value);
  if (n === 120 || n === 180 || n === 300) return n;
  if (n === 2 || n === 3 || n === 5) return n * 60;
  return 180;
}

function asPlayerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const id = String(value[i] ?? '').trim();
    if (!id) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function makePlayerRuntime(playerId: string, spectator = false): PlayerRuntime {
  return {
    playerId,
    phase: spectator ? 'spectator' : 'idle',
    totalWeight: 0,
    bestFish: 0,
    bestFishAtMs: Number.POSITIVE_INFINITY,
    firstCatchAtMs: Number.POSITIVE_INFINITY,
    lastCatchAtMs: Number.POSITIVE_INFINITY,
    catches: 0,
    xp: 0,
    onHookFishId: null,
    biteWindowStartMs: 0,
    biteWindowEndMs: 0,
    plannedBiteAtMs: 0,
    lureId: 'spinnerbait',
    hookQuality: null,
    reelStrength: 0,
    reelActive: false,
    tension: 0.36,
    stamina: 0,
    lineTightness: 0.45,
    notReelingMs: 0,
    slackMs: 0,
    cooldownUntilMs: 0,
    plannedFish: null,
    lastCastMs: -1_000_000,
    lastHookMs: -1_000_000,
    lastReelMs: -1_000_000,
    gearProfile: {
      drag: 0.74,
      rodFlex: 0.82,
      snapThreshold: 1,
      slackRecovery: 1
    }
  };
}

function hash32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function updateLeaderboard(players: PlayerRuntime[], mode: PartyMode): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = players.map((p) => ({
    playerId: p.playerId,
    totalWeight: p.totalWeight,
    bestFish: p.bestFish,
    bestFishAtMs: Number.isFinite(p.bestFishAtMs) ? p.bestFishAtMs : Number.MAX_SAFE_INTEGER,
    catches: p.catches,
    xp: p.xp,
    rank: 0
  }));

  entries.sort((a, b) => {
    if (mode === 'big_catch') {
      if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
      if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
      return a.bestFishAtMs - b.bestFishAtMs;
    }
    if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
    if (b.bestFish !== a.bestFish) return b.bestFish - a.bestFish;
    return a.bestFishAtMs - b.bestFishAtMs;
  });

  for (let i = 0; i < entries.length; i += 1) {
    entries[i].rank = i + 1;
  }
  return entries;
}

export class OzarkFishingMultiplayerAdapter
  implements MpAdapter<OzarkInput, OzarkSnapshot, OzarkEvent, OzarkResult>
{
  readonly isTurnBased = true;

  private role: 'host' | 'client' = 'client';
  private playerId = '';
  private playerIds: string[] = [];
  private activePlayers: PlayerRuntime[] = [];
  private spectators: string[] = [];

  private seed = 1;
  private rngState = 1;
  private sessionId = 'ozark-session-1';

  private phase: SessionPhase = 'waiting';
  private mode: PartyMode = 'derby';
  private durationMs = 300_000;
  private elapsedMs = 0;
  private weather: Weather = 'sunny';
  private timeOfDay: TimeOfDay = 'day';
  private assistAllowed = true;
  private spotId: SpotId = 'cove';
  private gearFairness: GearFairness = 'standardized';
  private rarityMultipliers = false;
  private allowedLures = new Set<string>(ALLOWED_LURES);
  private seasonId = 'spring';
  private weekKey = '1970-W01';
  private weeklyEventId: string | null = null;
  private useWeeklyEvent = true;
  private iceFishing = false;
  private tournamentEnabled = false;
  private tournamentFormat: TournamentFormat = 'bracket';
  private tournamentMatchType: PartyMode = 'derby';
  private tournamentDurationSec = 180;
  private tournamentName = 'Ozark Night Tournament';
  private tournamentState: TournamentState | null = null;
  private tournamentAssignment: TournamentMatchAssignment | null = null;
  private tournamentBootstrapPending = false;

  private lastEventId = 0;
  private stepCount = 0;
  private checksumTick = 0;
  private localChecksumMismatch = false;
  private pending: Array<{ fromPlayerId: string; input: OzarkInput }> = [];
  private catchFeed: CatchFeedItem[] = [];
  private outEvents: OzarkEvent[] = [];
  private result: OzarkResult | null = null;

  private disconnectedAt = new Map<string, number>();

  init(context: MpAdapterInitContext): void {
    this.role = context.role;
    this.playerId = context.playerId;
    this.seed = context.seed || 1;
    this.rngState = this.seed >>> 0;

    const playerIds = asPlayerIds(context.options?.playerIds);
    const uniquePlayers = playerIds.length > 0 ? playerIds : [this.playerId];
    this.playerIds = uniquePlayers;

    this.mode = normalizeMode(context.options?.partyMode ?? context.options?.mode);
    this.durationMs = normalizeDurationSec(context.options?.durationSec) * 1000;
    this.weather = normalizeWeather(context.options?.weather, () => this.nextRand());
    this.timeOfDay = normalizeTime(context.options?.time, () => this.nextRand());
    this.assistAllowed = context.options?.assistAllowed !== false;
    this.spotId = normalizeSpot(context.options?.spot ?? context.options?.spotId, () => this.nextRand());
    this.gearFairness = normalizeGearFairness(context.options?.gearFairness);
    this.rarityMultipliers = normalizeRarityMultipliers(context.options?.rarityMultipliers);
    this.useWeeklyEvent = context.options?.useWeeklyEvent !== false;

    const now = new Date();
    const seasons = loadSeasonCatalog();
    const events = loadWeeklyEvents();
    this.weekKey = String(context.options?.weekKey ?? isoWeekKey(now));
    this.seasonId = String(context.options?.seasonId ?? getSeasonForDate(now, seasons).id);
    this.weeklyEventId = this.useWeeklyEvent ? String(context.options?.eventId ?? pickWeeklyEvent(this.weekKey, events, 0).id) : null;
    this.iceFishing = context.options?.iceFishing === true || (context.options?.iceMode === true);
    this.tournamentEnabled = context.options?.tournamentMode === true;
    this.tournamentFormat = normalizeTournamentFormat(context.options?.tournamentFormat);
    this.tournamentMatchType = normalizeMode(context.options?.tournamentMatchType ?? context.options?.partyMode ?? context.options?.mode);
    this.tournamentDurationSec = normalizeTournamentDuration(context.options?.tournamentDurationSec ?? context.options?.durationSec);
    this.tournamentName = String(context.options?.tournamentName ?? 'Ozark Night Tournament').slice(0, 64);

    const allowed = Array.isArray(context.options?.allowedLures) ? (context.options?.allowedLures as unknown[]).map((v) => String(v)) : ALLOWED_LURES;
    this.allowedLures = new Set(allowed.filter((id) => ALLOWED_LURES.includes(id as (typeof ALLOWED_LURES)[number])));
    if (this.allowedLures.size === 0) this.allowedLures = new Set(ALLOWED_LURES);

    this.resetPlayerRuntimes();
    this.tournamentState = null;
    this.tournamentAssignment = null;
    if (this.tournamentEnabled && this.playerIds.length >= 4) {
      const roster = this.playerIds.slice(0, Math.min(MAX_PLAYERS, this.playerIds.length));
      const safeFormat = this.tournamentFormat === 'league' && roster.length > 8 ? 'bracket' : this.tournamentFormat;
      this.tournamentState = createTournamentState(this.seed, roster, {
        enabled: true,
        format: safeFormat,
        matchType: this.tournamentMatchType,
        durationSec: this.tournamentDurationSec,
        name: this.tournamentName
      });
      this.tournamentFormat = safeFormat;
    }
    this.tournamentBootstrapPending = false;

    this.sessionId = `ozark-${this.seed.toString(16)}-${hash32(this.playerIds.join('|')).toString(16)}`;
    this.phase = 'waiting';
    this.elapsedMs = 0;
    this.lastEventId = 0;
    this.pending = [];
    this.catchFeed = [];
    this.outEvents = [];
    this.result = null;
    this.disconnectedAt.clear();
  }

  onInput(localInput: OzarkInput): void {
    this.pending.push({ fromPlayerId: this.playerId, input: this.normalizeInput(localInput) });
  }

  onRemoteMessage(msg: unknown): void {
    const env = readInputEnvelope(msg);
    const fromPlayerId = typeof env?.fromPlayerId === 'string' ? env.fromPlayerId : '';
    if (!env || !fromPlayerId) return;
    this.pending.push({ fromPlayerId, input: this.normalizeInput(env.input as OzarkInput) });
  }

  getSnapshot(): OzarkSnapshot {
    const leaderboard = updateLeaderboard(this.activePlayers, this.mode);
    const checksum = this.computeChecksum();

    return {
      sessionId: this.sessionId,
      seed: this.seed,
      mode: this.mode,
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      assistAllowed: this.assistAllowed,
      durationMs: this.durationMs,
      elapsedMs: this.elapsedMs,
      remainingMs: Math.max(0, this.durationMs - this.elapsedMs),
      phase: this.phase,
      players: this.activePlayers.map((p) => ({
        playerId: p.playerId,
        phase: p.phase,
        totalWeight: p.totalWeight,
        bestFish: p.bestFish,
        bestFishAtMs: p.bestFishAtMs,
        catches: p.catches,
        xp: p.xp,
        tension: p.tension,
        lineTightness: p.lineTightness,
        onHookFishId: p.onHookFishId
      })),
      leaderboard,
      catchFeed: this.catchFeed,
      checksum,
      checksumTick: this.checksumTick,
      sessionConfig: {
        mode: this.mode,
        durationSec: Math.floor(this.durationMs / 1000),
        weather: this.weather,
        timeOfDay: this.timeOfDay,
        assistAllowed: this.assistAllowed,
        spotId: this.spotId,
        gearFairness: this.gearFairness,
        rarityMultipliers: this.rarityMultipliers,
        seasonId: this.seasonId,
        weekKey: this.weekKey,
        eventId: this.weeklyEventId,
        useWeeklyEvent: this.useWeeklyEvent,
        iceFishing: this.iceFishing,
        tournamentMode: this.tournamentEnabled,
        tournamentFormat: this.tournamentFormat,
        tournamentMatchType: this.tournamentMatchType,
        tournamentDurationSec: this.tournamentDurationSec,
        tournamentName: this.tournamentName
      },
      tournament: this.tournamentState
        ? {
            id: this.tournamentState.id,
            phase: this.tournamentState.phase,
            format: this.tournamentState.config.format,
            activeMatchId: this.tournamentState.activeMatchId,
            assignment: this.tournamentAssignment,
            standings: this.tournamentState.finalStandings,
            bracket: this.tournamentState.bracket,
            league: this.tournamentState.league
          }
        : undefined,
      lastEventId: this.lastEventId
    };
  }

  applySnapshot(snapshot: OzarkSnapshot): void {
    this.sessionId = snapshot.sessionId;
    this.seed = snapshot.seed;
    this.mode = snapshot.mode;
    this.weather = snapshot.weather;
    this.timeOfDay = snapshot.timeOfDay;
    this.assistAllowed = snapshot.assistAllowed;
    this.spotId = snapshot.sessionConfig.spotId;
    this.gearFairness = snapshot.sessionConfig.gearFairness;
    this.rarityMultipliers = snapshot.sessionConfig.rarityMultipliers;
    this.seasonId = snapshot.sessionConfig.seasonId;
    this.weekKey = snapshot.sessionConfig.weekKey;
    this.weeklyEventId = snapshot.sessionConfig.eventId;
    this.useWeeklyEvent = snapshot.sessionConfig.useWeeklyEvent;
    this.iceFishing = snapshot.sessionConfig.iceFishing === true;
    this.tournamentEnabled = snapshot.sessionConfig.tournamentMode === true;
    this.tournamentFormat = snapshot.sessionConfig.tournamentFormat ?? 'bracket';
    this.tournamentMatchType = snapshot.sessionConfig.tournamentMatchType ?? this.mode;
    this.tournamentDurationSec = snapshot.sessionConfig.tournamentDurationSec ?? Math.floor(snapshot.durationMs / 1000);
    this.tournamentName = snapshot.sessionConfig.tournamentName ?? 'Ozark Night Tournament';
    this.durationMs = snapshot.durationMs;
    this.elapsedMs = snapshot.elapsedMs;
    this.phase = snapshot.phase;
    this.lastEventId = snapshot.lastEventId;
    this.checksumTick = snapshot.checksumTick;

    this.activePlayers = snapshot.players.map((p) => ({
      ...makePlayerRuntime(p.playerId, p.phase === 'spectator'),
      phase: p.phase,
      totalWeight: p.totalWeight,
      bestFish: p.bestFish,
      bestFishAtMs: p.bestFishAtMs,
      firstCatchAtMs: Number.POSITIVE_INFINITY,
      lastCatchAtMs: Number.POSITIVE_INFINITY,
      catches: p.catches,
      xp: p.xp,
      tension: p.tension,
      lineTightness: p.lineTightness,
      onHookFishId: p.onHookFishId
    }));

    this.catchFeed = snapshot.catchFeed.slice(0, 12);
    this.tournamentState = snapshot.tournament
      ? {
          id: snapshot.tournament.id,
          roomSeed: this.seed,
          config: {
            enabled: true,
            format: snapshot.tournament.format,
            matchType: this.tournamentMatchType,
            durationSec: this.tournamentDurationSec,
            name: this.tournamentName
          },
          roster: this.playerIds.slice(),
          seeded: [],
          phase: snapshot.tournament.phase,
          startedAtIso: new Date().toISOString(),
          activeMatchId: snapshot.tournament.activeMatchId,
          bracket: snapshot.tournament.bracket,
          league: snapshot.tournament.league,
          finalStandings: snapshot.tournament.standings.slice()
        }
      : null;
    this.tournamentAssignment = snapshot.tournament?.assignment ?? null;
    this.tournamentBootstrapPending = false;

    const localChecksum = this.computeChecksum();
    if (snapshot.checksum !== localChecksum) {
      this.localChecksumMismatch = true;
    }
  }

  serializeEvent(event: OzarkEvent): unknown {
    return event;
  }

  applyEvent(event: OzarkEvent): void {
    if (event.eventId <= this.lastEventId) return;
    this.lastEventId = event.eventId;

    if (event.type === 'state_resync') {
      this.applySnapshot(event.snapshot);
      this.localChecksumMismatch = false;
      return;
    }

    if (event.type === 'state_checksum') {
      const checksum = this.computeChecksum();
      if (checksum !== event.checksum) {
        this.localChecksumMismatch = true;
      }
      return;
    }

    if (event.type === 'sessionEnd') {
      this.phase = 'ended';
      this.result = {
        mode: this.mode,
        winnerPlayerId: event.leaderboard[0]?.playerId ?? null,
        leaderboard: event.leaderboard
      };
    }
  }

  start(): void {
    this.phase = 'live';
    this.elapsedMs = 0;
    this.lastEventId = 0;
    this.stepCount = 0;
    this.checksumTick = 0;
    this.result = null;
    this.catchFeed = [];
    if (this.tournamentState) {
      this.mode = this.tournamentMatchType;
      this.durationMs = this.tournamentDurationSec * 1000;
      startTournament(this.tournamentState);
      this.assignTournamentMatch(false);
      this.tournamentBootstrapPending = true;
    }
    this.resetMatchRuntimes();
  }

  stop(): void {
    this.phase = 'ended';
  }

  step(dtS = 1 / 20): OzarkEvent[] {
    this.outEvents = [];

    if (this.role !== 'host') {
      if (this.localChecksumMismatch) {
        this.pending.push({ fromPlayerId: this.playerId, input: { type: 'checksum_mismatch', checksum: this.computeChecksum() } });
        this.localChecksumMismatch = false;
      }
      return this.outEvents;
    }

    if (this.phase !== 'live') return this.outEvents;

    const dtMs = clamp(dtS, 0, 0.2) * 1000;
    this.elapsedMs += dtMs;
    this.stepCount += 1;

    if (this.tournamentBootstrapPending && this.tournamentState) {
      this.emit({
        type: 'tournament_create',
        eventId: 0,
        config: this.tournamentState.config,
        roster: this.tournamentState.roster.slice(),
        seedOrder: this.tournamentState.seeded.map((entry) => entry.playerId),
        tMs: Math.floor(this.elapsedMs)
      });
      this.emit({
        type: 'tournament_start',
        eventId: 0,
        bracketState: this.tournamentState.bracket,
        leagueState: this.tournamentState.league,
        tMs: Math.floor(this.elapsedMs)
      });
      if (this.tournamentAssignment) {
        this.emit({
          type: 'match_assign',
          eventId: 0,
          matchId: this.tournamentAssignment.matchId,
          players: this.tournamentAssignment.players.slice(),
          spectators: this.tournamentAssignment.spectators.slice(),
          tMs: Math.floor(this.elapsedMs)
        });
      }
      this.tournamentBootstrapPending = false;
    }

    this.processPendingInputs();
    this.stepPlayers(dtMs);

    if (this.stepCount % CHECKSUM_INTERVAL_STEPS === 0) {
      this.checksumTick += 1;
      this.emit({
        type: 'state_checksum',
        eventId: 0,
        checksum: this.computeChecksum(),
        tMs: Math.floor(this.elapsedMs)
      });
    }

    if (this.elapsedMs >= this.durationMs && this.phase === 'live') {
      if (this.tournamentState) {
        this.finalizeTournamentMatch();
      } else {
        const leaderboard = updateLeaderboard(this.activePlayers, this.mode);
        this.phase = 'ended';
        this.emit({
          type: 'sessionEnd',
          eventId: 0,
          leaderboard,
          tMs: Math.floor(this.elapsedMs)
        });
        this.result = {
          mode: this.mode,
          winnerPlayerId: leaderboard[0]?.playerId ?? null,
          leaderboard
        };
      }
    }

    this.pruneDisconnected();

    return this.outEvents;
  }

  getResult(): OzarkResult | null {
    return this.result;
  }

  private resetPlayerRuntimes() {
    const active = this.playerIds.slice(0, MAX_PLAYERS);
    const spectators = this.playerIds.slice(MAX_PLAYERS);
    this.activePlayers = active.map((id) => makePlayerRuntime(id, false));
    this.spectators = spectators;

    for (let i = 0; i < this.spectators.length; i += 1) {
      const specId = this.spectators[i];
      if (!this.activePlayers.find((p) => p.playerId === specId)) {
        this.activePlayers.push(makePlayerRuntime(specId, true));
      }
    }
  }

  private resetMatchRuntimes() {
    for (let i = 0; i < this.activePlayers.length; i += 1) {
      const p = this.activePlayers[i];
      const isActiveTournamentPlayer = this.tournamentAssignment?.players.includes(p.playerId) ?? true;
      p.phase = isActiveTournamentPlayer ? 'idle' : 'spectator';
      p.totalWeight = 0;
      p.bestFish = 0;
      p.bestFishAtMs = Number.POSITIVE_INFINITY;
      p.firstCatchAtMs = Number.POSITIVE_INFINITY;
      p.lastCatchAtMs = Number.POSITIVE_INFINITY;
      p.catches = 0;
      p.xp = 0;
      p.tension = 0.36;
      p.lineTightness = 0.45;
      p.slackMs = 0;
      p.notReelingMs = 0;
      p.reelActive = false;
      p.reelStrength = 0;
      p.plannedFish = null;
      p.onHookFishId = null;
      p.hookQuality = null;
      p.cooldownUntilMs = 0;
      p.biteWindowStartMs = 0;
      p.biteWindowEndMs = 0;
      p.plannedBiteAtMs = 0;
      p.gearProfile = this.resolveGearProfile(p.playerId);
    }
  }

  private assignTournamentMatch(emitEvent = true) {
    if (!this.tournamentState) {
      this.tournamentAssignment = null;
      return;
    }
    this.tournamentAssignment = currentMatchAssignment(this.tournamentState);
    if (!this.tournamentAssignment) return;
    if (emitEvent) {
      this.emit({
        type: 'match_assign',
        eventId: 0,
        matchId: this.tournamentAssignment.matchId,
        players: this.tournamentAssignment.players.slice(),
        spectators: this.tournamentAssignment.spectators.slice(),
        tMs: Math.floor(this.elapsedMs)
      });
    }
  }

  private finalizeTournamentMatch() {
    if (!this.tournamentState || !this.tournamentAssignment) return;

    const scores: MatchPlayerScore[] = this.tournamentAssignment.players.map((playerId) => {
      const player = this.activePlayers.find((entry) => entry.playerId === playerId) ?? makePlayerRuntime(playerId, false);
      return {
        playerId,
        totalWeight: player.totalWeight,
        bestFish: player.bestFish,
        lastCatchTimeMs: Number.isFinite(player.lastCatchAtMs) ? player.lastCatchAtMs : Number.MAX_SAFE_INTEGER,
        firstCatchTimeMs: Number.isFinite(player.firstCatchAtMs) ? player.firstCatchAtMs : Number.MAX_SAFE_INTEGER
      };
    });

    const completed = completeCurrentMatch(this.tournamentState, scores);
    this.emit({
      type: 'match_result',
      eventId: 0,
      matchId: this.tournamentAssignment.matchId,
      standings: completed.result.standings,
      tieBreakData: completed.result.tieBreakData,
      tMs: Math.floor(this.elapsedMs)
    });

    this.emit({
      type: 'tournament_advance',
      eventId: 0,
      updatedState: {
        phase: this.tournamentState.phase,
        activeMatchId: this.tournamentState.activeMatchId,
        finalStandings: this.tournamentState.finalStandings.slice()
      },
      tMs: Math.floor(this.elapsedMs)
    });

    if (this.tournamentState.phase === 'complete') {
      this.phase = 'ended';
      this.emit({
        type: 'tournament_end',
        eventId: 0,
        finalStandings: this.tournamentState.finalStandings.slice(),
        tMs: Math.floor(this.elapsedMs)
      });

      const leaderboard: LeaderboardEntry[] = this.tournamentState.finalStandings.map((playerId, idx) => {
        const p = this.activePlayers.find((entry) => entry.playerId === playerId);
        return {
          playerId,
          totalWeight: p?.totalWeight ?? 0,
          bestFish: p?.bestFish ?? 0,
          bestFishAtMs: p?.bestFishAtMs ?? Number.MAX_SAFE_INTEGER,
          catches: p?.catches ?? 0,
          xp: p?.xp ?? 0,
          rank: idx + 1
        };
      });

      this.emit({
        type: 'sessionEnd',
        eventId: 0,
        leaderboard,
        tMs: Math.floor(this.elapsedMs)
      });
      this.result = {
        mode: this.tournamentMatchType,
        winnerPlayerId: this.tournamentState.finalStandings[0] ?? null,
        leaderboard
      };

      if (this.role === 'host') {
        pushTournamentHistory({
          id: this.tournamentState.id,
          dateIso: new Date().toISOString(),
          format: this.tournamentState.config.format,
          matchType: this.tournamentState.config.matchType,
          durationSec: this.tournamentState.config.durationSec,
          standings: this.tournamentState.finalStandings.slice(0, 10),
          topFishWeight: Math.max(0, ...this.activePlayers.map((entry) => entry.bestFish)),
          posterMetadata: `${this.tournamentState.config.name}|${this.tournamentState.finalStandings.slice(0, 3).join(',')}`
        });
      }
      return;
    }

    this.assignTournamentMatch();
    this.elapsedMs = 0;
    this.phase = 'live';
    this.resetMatchRuntimes();
  }

  private normalizeInput(input: OzarkInput): OzarkInput {
    if (input.type) return input;

    // Pointer fallback from AdapterMultiplayerScene.
    if (typeof input.pressed === 'boolean' && input.pressed) {
      return {
        type: 'cast',
        timestamp: Number(input.timestamp ?? this.elapsedMs),
        cast: {
          aim: clamp(Number(input.x ?? 0), -1, 1),
          power: clamp(1 - clamp((Number(input.y ?? 0) + 1) * 0.5, 0, 1), 0, 1),
          lureId: 'spinnerbait'
        }
      };
    }

    return {
      type: 'reelInput',
      timestamp: Number(input.timestamp ?? this.elapsedMs),
      reel: {
        action: 'strength',
        strength: input.pressed ? 0.9 : 0
      }
    };
  }

  private processPendingInputs() {
    while (this.pending.length > 0) {
      const pending = this.pending.shift();
      if (!pending) break;

      const player = this.activePlayers.find((p) => p.playerId === pending.fromPlayerId);
      if (!player) {
        this.disconnectedAt.set(pending.fromPlayerId, this.elapsedMs);
        continue;
      }

      const input = pending.input;
      if (input.type === 'checksum_mismatch') {
        this.emit({
          type: 'state_resync',
          eventId: 0,
          snapshot: this.getSnapshot(),
          tMs: Math.floor(this.elapsedMs)
        });
        continue;
      }

      if (player.phase === 'spectator') {
        this.rejectInput(player, 'spectator_cannot_act');
        continue;
      }

      if (input.type === 'cast') {
        this.handleCast(player, input);
        continue;
      }

      if (input.type === 'hookAttempt') {
        this.handleHookAttempt(player);
        continue;
      }

      if (input.type === 'reelInput') {
        this.handleReelInput(player, input);
        continue;
      }
    }
  }

  private handleCast(player: PlayerRuntime, input: OzarkInput) {
    const now = this.elapsedMs;

    if (now - player.lastCastMs < 240) {
      this.rejectInput(player, 'cast_rate_limited');
      return;
    }
    player.lastCastMs = now;

    const cast = input.cast;
    if (!cast) {
      this.rejectInput(player, 'cast_payload_missing');
      return;
    }

    if (player.phase !== 'idle' && !(player.phase === 'cooldown' && now >= player.cooldownUntilMs)) {
      this.rejectInput(player, 'cast_not_allowed_in_state');
      return;
    }

    const lureId = String(cast.lureId || '');
    if (!this.allowedLures.has(lureId)) {
      this.rejectInput(player, 'lure_not_allowed');
      return;
    }

    player.phase = 'lure';
    player.lureId = lureId;
    player.reelActive = false;
    player.reelStrength = 0;

    const aim = clamp(Number(cast.aim ?? 0), -1, 1);
    const power = clamp(Number(cast.power ?? 0), 0, 1);
    const biteDelay = (this.iceFishing ? 540 : 650) + this.nextRand() * (this.iceFishing ? 1200 : 1600) + (1 - power) * 420 + Math.abs(aim) * 120;

    player.plannedFish = this.rollFish(player.playerId, lureId, power);
    player.plannedBiteAtMs = now + biteDelay;
  }

  private handleHookAttempt(player: PlayerRuntime) {
    const now = this.elapsedMs;
    if (now - player.lastHookMs < 90) {
      this.rejectInput(player, 'hook_rate_limited');
      return;
    }
    player.lastHookMs = now;

    if (player.phase !== 'bite_window') {
      this.rejectInput(player, 'hook_outside_window');
      this.emit({
        type: 'escapeResult',
        eventId: 0,
        playerId: player.playerId,
        reason: 'invalid_hook',
        tMs: Math.floor(this.elapsedMs)
      });
      return;
    }

    const center = (player.biteWindowStartMs + player.biteWindowEndMs) * 0.5;
    const offset = Math.abs(now - center);
    const half = (player.biteWindowEndMs - player.biteWindowStartMs) * 0.5;

    if (now < player.biteWindowStartMs || now > player.biteWindowEndMs) {
      player.phase = 'cooldown';
      player.cooldownUntilMs = now + 450;
      this.emit({
        type: 'escapeResult',
        eventId: 0,
        playerId: player.playerId,
        reason: 'invalid_hook',
        tMs: Math.floor(this.elapsedMs)
      });
      return;
    }

    let quality: HookQuality = 'poor';
    if (offset <= half * 0.25) quality = 'perfect';
    else if (offset <= half * 0.7) quality = 'good';

    const planned = player.plannedFish;
    if (!planned) {
      this.rejectInput(player, 'hook_without_planned_fish');
      return;
    }

    const staminaScale = quality === 'perfect' ? 0.86 : quality === 'good' ? 1 : 1.2;
    const aggressionScale = quality === 'perfect' ? 0.9 : quality === 'good' ? 1 : 1.18;

    player.phase = 'hooked';
    player.hookQuality = quality;
    player.onHookFishId = planned.fishId;
    player.stamina = planned.stamina * staminaScale;
    player.tension = 0.38;
    player.lineTightness = 0.52;
    player.slackMs = 0;
    player.notReelingMs = 0;
    if (player.plannedFish) {
      player.plannedFish.aggression *= aggressionScale;
    }

    this.emit({
      type: 'hookResult',
      eventId: 0,
      playerId: player.playerId,
      quality,
      fishId: planned.fishId,
      staminaSeed: Math.floor(planned.stamina),
      tMs: Math.floor(this.elapsedMs)
    });
  }

  private handleReelInput(player: PlayerRuntime, input: OzarkInput) {
    const now = this.elapsedMs;
    if (now - player.lastReelMs < 25) {
      this.rejectInput(player, 'reel_rate_limited');
      return;
    }
    player.lastReelMs = now;

    if (player.phase !== 'hooked' && player.phase !== 'reeling') {
      this.rejectInput(player, 'reel_without_hook');
      return;
    }

    const reel = input.reel;
    if (!reel) {
      this.rejectInput(player, 'reel_payload_missing');
      return;
    }

    if (reel.action === 'start') {
      player.reelActive = true;
      player.phase = 'reeling';
      return;
    }
    if (reel.action === 'stop') {
      player.reelActive = false;
      player.phase = 'hooked';
      return;
    }

    player.reelStrength = clamp(Number(reel.strength ?? 0), 0, 1);
    player.reelActive = player.reelStrength > 0.02;
    player.phase = player.reelActive ? 'reeling' : 'hooked';
  }

  private stepPlayers(dtMs: number) {
    for (let i = 0; i < this.activePlayers.length; i += 1) {
      const player = this.activePlayers[i];
      if (player.phase === 'spectator') continue;

      if (player.phase === 'lure' && this.elapsedMs >= player.plannedBiteAtMs && player.plannedFish) {
        player.phase = 'bite_window';
        player.biteWindowStartMs = this.elapsedMs;
        player.biteWindowEndMs = this.elapsedMs + 760;

        this.emit({
          type: 'biteWindowStart',
          eventId: 0,
          playerId: player.playerId,
          windowMs: 760,
          fishHint: player.plannedFish.rarity,
          tMs: Math.floor(this.elapsedMs)
        });
      }

      if (player.phase === 'bite_window' && this.elapsedMs > player.biteWindowEndMs) {
        player.phase = 'cooldown';
        player.cooldownUntilMs = this.elapsedMs + 420;
        player.plannedFish = null;
        player.onHookFishId = null;
        this.emit({
          type: 'escapeResult',
          eventId: 0,
          playerId: player.playerId,
          reason: 'missed_hook',
          tMs: Math.floor(this.elapsedMs)
        });
      }

      if (player.phase === 'hooked' || player.phase === 'reeling') {
        const fish = player.plannedFish;
        if (!fish) {
          player.phase = 'idle';
          continue;
        }

        const dtS = dtMs / 1000;
        const fishPull = clamp((0.5 + fish.aggression * 0.36) * (0.7 + this.nextRand() * 0.6), 0.2, 2.3);
        const reel = player.reelActive ? player.reelStrength : 0;
        const drag = player.gearProfile.drag;
        const rodFlex = player.gearProfile.rodFlex;

        const nonlinearRun = Math.pow(fishPull, 1.5) * 0.36;
        const rise = nonlinearRun * (1 - drag * 0.42) * (1 - (1 - rodFlex) * 0.45);
        const release = Math.pow(reel, 1.18) * (0.34 + drag * 0.25);
        const baseRelax = Math.max(0, 0.16 - fishPull * 0.08);

        player.tension = clamp(player.tension + (rise - release - baseRelax) * dtS, 0, 1.25);

        player.stamina -= reel * dtS * (15 + drag * 7);
        player.stamina += Math.max(0, fishPull - reel * 0.8) * dtS * 2.8;
        player.stamina = Math.max(0, player.stamina);

        player.notReelingMs = reel < 0.08 ? player.notReelingMs + dtMs : Math.max(0, player.notReelingMs - dtMs * 0.9);
        player.slackMs = player.tension < 0.2 ? player.slackMs + dtMs : Math.max(0, player.slackMs - dtMs * 0.72 * player.gearProfile.slackRecovery);
        if (player.notReelingMs > 900) {
          player.slackMs += dtMs * 0.65;
        }

        player.lineTightness = clamp(0.2 + player.tension * 0.95 - player.slackMs / 4200, 0, 1);

        if (player.tension >= player.gearProfile.snapThreshold) {
          this.escapePlayer(player, 'line_snap');
          continue;
        }

        if (player.slackMs >= 1700) {
          this.escapePlayer(player, 'slack');
          continue;
        }

        if (player.stamina <= 0 && player.tension > 0.24 && player.tension < 0.92 * player.gearProfile.snapThreshold && reel > 0.05) {
          this.completeCatch(player, fish);
          continue;
        }
      }

      if (player.phase === 'cooldown' && this.elapsedMs >= player.cooldownUntilMs) {
        player.phase = 'idle';
      }
    }
  }

  private completeCatch(player: PlayerRuntime, fish: PlannedFish) {
    const now = Math.floor(this.elapsedMs);
    const eventDerbyBonus = this.weeklyEventId === 'trophy-hunt' ? 1.06 : this.weeklyEventId === 'speed-derby' ? 1.12 : 1;
    const eventBigBonus = this.weeklyEventId === 'trophy-hunt' ? 1.18 : 1;
    const multiplier = this.mode === 'derby'
      ? (this.rarityMultipliers ? RARITY_MULTIPLIER[fish.rarity] : 1) * eventDerbyBonus
      : eventBigBonus;
    const scoredWeight = fish.weight * multiplier;
    const xp = Math.max(6, Math.round((fish.weight * 11 + fish.aggression * 12) * RARITY_MULTIPLIER[fish.rarity]));

    player.totalWeight += scoredWeight;
    player.catches += 1;
    player.xp += xp;
    player.lastCatchAtMs = now;
    if (!Number.isFinite(player.firstCatchAtMs)) player.firstCatchAtMs = now;

    if (fish.weight > player.bestFish) {
      player.bestFish = fish.weight;
      player.bestFishAtMs = now;
    }

    this.catchFeed.unshift({
      playerId: player.playerId,
      fishId: fish.fishId,
      rarity: fish.rarity,
      weight: fish.weight,
      timeMs: now
    });
    if (this.catchFeed.length > 12) this.catchFeed.length = 12;

    this.emit({
      type: 'catchResult',
      eventId: 0,
      playerId: player.playerId,
      fishId: fish.fishId,
      rarity: fish.rarity,
      weight: fish.weight,
      xp,
      timeMs: now
    });

    player.phase = 'cooldown';
    player.cooldownUntilMs = this.elapsedMs + 520;
    player.plannedFish = null;
    player.onHookFishId = null;
    player.hookQuality = null;
    player.reelActive = false;
    player.reelStrength = 0;
    player.tension = 0.36;
    player.lineTightness = 0.45;
    player.notReelingMs = 0;
    player.slackMs = 0;
    player.stamina = 0;
  }

  private escapePlayer(player: PlayerRuntime, reason: EscapeReason) {
    player.phase = 'cooldown';
    player.cooldownUntilMs = this.elapsedMs + 420;
    player.plannedFish = null;
    player.onHookFishId = null;
    player.hookQuality = null;
    player.reelActive = false;
    player.reelStrength = 0;
    player.tension = 0.36;
    player.lineTightness = 0.45;
    player.notReelingMs = 0;
    player.slackMs = 0;
    player.stamina = 0;

    this.emit({
      type: 'escapeResult',
      eventId: 0,
      playerId: player.playerId,
      reason,
      tMs: Math.floor(this.elapsedMs)
    });
  }

  private rejectInput(player: PlayerRuntime, reason: string) {
    this.emit({
      type: 'inputRejected',
      eventId: 0,
      playerId: player.playerId,
      reason,
      tMs: Math.floor(this.elapsedMs)
    });
  }

  private emit(event: OzarkEvent) {
    this.lastEventId += 1;
    event.eventId = this.lastEventId;
    this.outEvents.push(event);
  }

  private rollFish(playerId: string, lureId: string, power: number): PlannedFish {
    const pBias = hash32(`${playerId}:${lureId}:${Math.floor(this.elapsedMs / 100)}`) % 1000;
    const weightedRoll = (this.nextRand() + pBias / 1000) * 0.5;

    let total = 0;
    for (let i = 0; i < FISH_TABLE.length; i += 1) {
      total += rarityWeight(FISH_TABLE[i].rarity) * this.spotFishWeight(this.spotId, FISH_TABLE[i].id);
    }

    let pick = weightedRoll * total;
    let chosen = FISH_TABLE[0];
    for (let i = 0; i < FISH_TABLE.length; i += 1) {
      pick -= rarityWeight(FISH_TABLE[i].rarity) * this.spotFishWeight(this.spotId, FISH_TABLE[i].id);
      if (pick <= 0) {
        chosen = FISH_TABLE[i];
        break;
      }
    }

    const weatherBoost =
      this.weather === 'light_rain' && (chosen.id === 'largemouth-bass' || chosen.id === 'smallmouth-bass')
        ? 1.12
        : this.weather === 'sunny' && chosen.rarity === 'common'
          ? 0.95
          : 1;
    const iceBoost = this.iceFishing && (chosen.id === 'walleye' || chosen.id === 'bluegill' || chosen.id === 'crappie') ? 1.14 : 1;

    const weeklyBoost =
      this.weeklyEventId === 'bass-frenzy' && (chosen.id === 'largemouth-bass' || chosen.id === 'smallmouth-bass')
        ? 1.16
        : this.weeklyEventId === 'catfish-nights' && chosen.id === 'catfish'
          ? 1.18
          : this.weeklyEventId === 'deep-drop-legends' && chosen.rarity === 'rare'
            ? 1.12
            : 1;

    const baseWeight = chosen.minWeight + (chosen.maxWeight - chosen.minWeight) * clamp(this.nextRand() * (0.6 + power * 0.55), 0, 1);
    const spotWeightBoost = this.spotId === 'open-water' || this.spotId === 'river-mouth' ? 1.05 : 0.98;
    const weight = clamp(baseWeight * weatherBoost * spotWeightBoost * weeklyBoost * iceBoost, chosen.minWeight, chosen.maxWeight);

    return {
      fishId: chosen.id,
      rarity: chosen.rarity,
      weight,
      stamina: 24 + chosen.difficulty * 35 + weight * 1.15,
      aggression: 0.56 + chosen.difficulty * 0.22
    };
  }

  private computeChecksum(): number {
    let hash = 2166136261;
    hash ^= this.phase.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
    hash ^= Math.floor(this.elapsedMs);
    hash = Math.imul(hash, 16777619);
    hash ^= this.mode === 'big_catch' ? 2 : 1;
    hash = Math.imul(hash, 16777619);

    for (let i = 0; i < this.activePlayers.length; i += 1) {
      const p = this.activePlayers[i];
      hash ^= hash32(p.playerId);
      hash = Math.imul(hash, 16777619);
      hash ^= Math.round(p.totalWeight * 100);
      hash = Math.imul(hash, 16777619);
      hash ^= Math.round(p.bestFish * 100);
      hash = Math.imul(hash, 16777619);
      hash ^= p.catches;
      hash = Math.imul(hash, 16777619);
      hash ^= Math.round(p.tension * 1000);
      hash = Math.imul(hash, 16777619);
      hash ^= Math.round(p.lineTightness * 1000);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  private nextRand(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0x100000000;
  }

  private pruneDisconnected() {
    const now = this.elapsedMs;
    for (const [playerId, since] of this.disconnectedAt.entries()) {
      if (now - since > RECONNECT_GRACE_MS) {
        this.disconnectedAt.delete(playerId);
      }
    }
  }

  private spotFishWeight(spot: SpotId, fishId: string): number {
    if (spot === 'cove') {
      if (fishId === 'bluegill' || fishId === 'largemouth-bass') return 1.25;
      if (fishId === 'ozark-muskie') return 0.78;
    }
    if (spot === 'dock') {
      if (fishId === 'crappie' || fishId === 'smallmouth-bass') return 1.2;
    }
    if (spot === 'open-water') {
      if (fishId === 'walleye' || fishId === 'carp' || fishId === 'ozark-muskie') return 1.24;
      if (fishId === 'bluegill') return 0.74;
    }
    if (spot === 'river-mouth') {
      if (fishId === 'smallmouth-bass' || fishId === 'catfish') return 1.18;
    }
    return 1;
  }

  private resolveGearProfile(playerId: string): PlayerRuntime['gearProfile'] {
    if (this.gearFairness === 'standardized') {
      return {
        drag: 0.74,
        rodFlex: 0.82,
        snapThreshold: 1,
        slackRecovery: 1
      };
    }

    const roll = (hash32(`${playerId}:${this.seed}`) % 1000) / 1000;
    return {
      drag: 0.68 + roll * 0.28,
      rodFlex: 0.76 + roll * 0.18,
      snapThreshold: 0.9 + roll * 0.24,
      slackRecovery: 0.9 + roll * 0.22
    };
  }
}

export const ozark_fishingMpAdapter = new OzarkFishingMultiplayerAdapter();
