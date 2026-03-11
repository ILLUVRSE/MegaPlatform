import type {
  BattlePassState,
  DailyQuestProgress,
  DailyRewardState,
  GameStats,
  InventoryState,
  PortalCurrency,
  PortalStats,
  RankRecord,
  RankState,
  RankTier
} from '../types';

const BASE_XP_PER_MATCH = 40;
const SCORE_XP_DIVISOR = 1;
const SCORE_XP_CAP = 0;
const WIN_BONUS_XP = 60;

export interface ProgressTitle {
  id: string;
  name: string;
  description: string;
}

export const PROGRESS_TITLES: readonly ProgressTitle[] = [
  { id: 'rookie', name: 'Rookie', description: 'Finish your first completed match.' },
  { id: 'regular', name: 'Arcade Regular', description: 'Complete 25 matches across GameGrid.' },
  { id: 'veteran', name: 'Arcade Veteran', description: 'Complete 100 matches across GameGrid.' },
  { id: 'specialist', name: 'All-Round Specialist', description: 'Play at least 10 different games.' },
  { id: 'score-hunter', name: 'Score Hunter', description: 'Accumulate 5,000 total score.' },
  { id: 'champion', name: 'Champion', description: 'Earn 50 wins across all games.' }
] as const;

export interface ProgressUpdate {
  next: PortalStats;
  newTitles: string[];
  xpGained: number;
  levelUp: boolean;
}

type EventRecord = Readonly<Record<string, unknown>>;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asGameStats(input: unknown): GameStats {
  const row = input as Partial<GameStats> | undefined;
  const plays = asFiniteNumber(row?.plays);
  const bestScore = asFiniteNumber(row?.bestScore);
  const lastScore = asFiniteNumber(row?.lastScore);
  const wins = asFiniteNumber(row?.wins);
  return {
    plays: plays === null ? 0 : Math.max(0, Math.trunc(plays)),
    bestScore: bestScore ?? 0,
    lastScore: lastScore ?? 0,
    wins: wins === null ? 0 : Math.max(0, Math.trunc(wins))
  };
}

function asCurrency(input: unknown): PortalCurrency {
  const row = (input ?? {}) as Partial<PortalCurrency>;
  const tickets = typeof row.tickets === 'number' && Number.isFinite(row.tickets) ? row.tickets : 0;
  const tokens = typeof row.tokens === 'number' && Number.isFinite(row.tokens) ? row.tokens : 0;
  return {
    tickets: Math.max(0, Math.trunc(tickets)),
    tokens: Math.max(0, Math.trunc(tokens))
  };
}

function asInventory(input: unknown): InventoryState {
  const row = (input ?? {}) as Partial<InventoryState>;
  const owned = Array.isArray(row.owned) ? row.owned.filter((id): id is string => typeof id === 'string') : [];
  const equipped = typeof row.equipped === 'string' ? row.equipped : null;
  return {
    owned,
    equipped: equipped && owned.includes(equipped) ? equipped : null
  };
}

function asDailyQuests(input: unknown): { dateKey: string; quests: DailyQuestProgress[] } {
  const row = (input ?? {}) as { dateKey?: unknown; quests?: unknown };
  const dateKey = typeof row.dateKey === 'string' ? row.dateKey : '';
  const quests = Array.isArray(row.quests)
    ? row.quests
        .filter((quest) => typeof quest === 'object' && quest !== null)
        .map((quest) => {
          const parsed = quest as Partial<DailyQuestProgress>;
          return {
            id: typeof parsed.id === 'string' ? parsed.id : `legacy-${Math.random().toString(36).slice(2, 7)}`,
            name: typeof parsed.name === 'string' ? parsed.name : 'Daily Quest',
            description: typeof parsed.description === 'string' ? parsed.description : '',
            kind: (parsed.kind ?? 'play_matches') as DailyQuestProgress['kind'],
            target: typeof parsed.target === 'number' && Number.isFinite(parsed.target) ? parsed.target : 1,
            progress: typeof parsed.progress === 'number' && Number.isFinite(parsed.progress) ? parsed.progress : 0,
            rewardTickets:
              typeof parsed.rewardTickets === 'number' && Number.isFinite(parsed.rewardTickets) ? parsed.rewardTickets : 0,
            completed: parsed.completed === true,
            gameId: typeof parsed.gameId === 'string' ? parsed.gameId : null,
            uniqueGameIds: Array.isArray(parsed.uniqueGameIds)
              ? parsed.uniqueGameIds.filter((id): id is string => typeof id === 'string')
              : []
          };
        })
    : [];
  return { dateKey, quests };
}

const RANK_TIERS: readonly RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster'];

function asRankTier(value: unknown): RankTier {
  if (typeof value === 'string' && RANK_TIERS.includes(value as RankTier)) return value as RankTier;
  return 'bronze';
}

function asRankRecord(input: unknown): RankRecord {
  const row = (input ?? {}) as Partial<RankRecord>;
  const rating = typeof row.rating === 'number' && Number.isFinite(row.rating) ? row.rating : 1000;
  const matches = typeof row.matches === 'number' && Number.isFinite(row.matches) ? row.matches : 0;
  const wins = typeof row.wins === 'number' && Number.isFinite(row.wins) ? row.wins : 0;
  const losses = typeof row.losses === 'number' && Number.isFinite(row.losses) ? row.losses : 0;
  const tier = asRankTier(row.tier);
  const peakTier = asRankTier(row.peakTier ?? tier);
  return {
    rating: Math.max(0, Math.round(rating)),
    tier,
    peakTier,
    matches: Math.max(0, Math.trunc(matches)),
    wins: Math.max(0, Math.trunc(wins)),
    losses: Math.max(0, Math.trunc(losses))
  };
}

function asRankState(input: unknown): RankState {
  const row = (input ?? {}) as Partial<RankState>;
  const perGame: Record<string, RankRecord> = {};
  const perGameIn = row.perGame ?? {};
  for (const [gameId, record] of Object.entries(perGameIn)) {
    perGame[gameId] = asRankRecord(record);
  }
  return {
    seasonId: typeof row.seasonId === 'string' ? row.seasonId : '',
    perGame,
    meta: asRankRecord(row.meta)
  };
}

function asBattlePass(input: unknown): BattlePassState {
  const row = (input ?? {}) as Partial<BattlePassState>;
  const tier = typeof row.tier === 'number' && Number.isFinite(row.tier) ? row.tier : 0;
  const xp = typeof row.xp === 'number' && Number.isFinite(row.xp) ? row.xp : 0;
  return {
    seasonId: typeof row.seasonId === 'string' ? row.seasonId : '',
    tier: Math.max(0, Math.trunc(tier)),
    xp: Math.max(0, Math.trunc(xp)),
    premiumUnlocked: row.premiumUnlocked === true
  };
}

function asDailyReward(input: unknown): DailyRewardState {
  const row = (input ?? {}) as Partial<DailyRewardState>;
  return {
    dateKey: typeof row.dateKey === 'string' ? row.dateKey : null,
    streakDay: typeof row.streakDay === 'number' && Number.isFinite(row.streakDay) ? row.streakDay : 0,
    lastClaimedOn: typeof row.lastClaimedOn === 'string' ? row.lastClaimedOn : null
  };
}

export function normalizePortalStats(input: unknown): PortalStats {
  const parsed = (input ?? {}) as Partial<PortalStats>;
  const perGameIn = parsed.perGame ?? {};
  const perGame: Record<string, GameStats> = {};
  for (const [gameId, stats] of Object.entries(perGameIn)) {
    perGame[gameId] = asGameStats(stats);
  }

  const totalWins = Object.values(perGame).reduce((sum, row) => sum + (row.wins ?? 0), 0);

  return {
    lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : null,
    perGame,
    totalPlays: Number.isFinite(parsed.totalPlays) ? Math.max(0, Math.trunc(parsed.totalPlays!)) : 0,
    totalScore: Number.isFinite(parsed.totalScore) ? parsed.totalScore! : 0,
    xp: Number.isFinite(parsed.xp) ? Math.max(0, Math.trunc(parsed.xp!)) : 0,
    level: Number.isFinite(parsed.level) ? Math.max(1, Math.trunc(parsed.level!)) : 1,
    unlockedTitles: Array.isArray(parsed.unlockedTitles)
      ? parsed.unlockedTitles.filter((entry): entry is string => typeof entry === 'string')
      : [],
    dailyStreak: Number.isFinite(parsed.dailyStreak) ? Math.max(0, Math.trunc(parsed.dailyStreak!)) : 0,
    longestStreak: Number.isFinite(parsed.longestStreak) ? Math.max(0, Math.trunc(parsed.longestStreak!)) : 0,
    lastPlayedOn: typeof parsed.lastPlayedOn === 'string' ? parsed.lastPlayedOn : null,
    totalWins: Number.isFinite(parsed.totalWins) ? Math.max(0, Math.trunc(parsed.totalWins!)) : totalWins,
    currency: asCurrency(parsed.currency),
    dailyQuests: asDailyQuests(parsed.dailyQuests),
    inventory: asInventory(parsed.inventory),
    rank: asRankState(parsed.rank),
    battlePass: asBattlePass(parsed.battlePass),
    dailyReward: asDailyReward(parsed.dailyReward)
  };
}

function isoDay(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dayDiff(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function levelFromXp(xp: number): number {
  return levelProgressFromXp(xp).level;
}

export function levelProgressFromXp(xp: number): { level: number; inLevelXp: number; nextLevelXp: number } {
  let level = 1;
  let needed = 120;
  let remaining = Math.max(0, xp);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.18);
  }
  return { level, inLevelXp: remaining, nextLevelXp: needed };
}

function inferWin(event: EventRecord): boolean {
  const winner = event.winner;
  if (winner === 'player' || winner === 'home' || winner === 'p1' || winner === 'team-a') return true;
  const outcome = event.outcome;
  if (typeof outcome === 'string') {
    const normalized = outcome.toLowerCase();
    return normalized.includes('win') || normalized.includes('victory');
  }
  return false;
}

function unlockTitles(stats: PortalStats): string[] {
  const newlyUnlocked: string[] = [];
  const existing = new Set(stats.unlockedTitles);
  const uniqueGamesPlayed = Object.values(stats.perGame).filter((row) => row.plays > 0).length;

  const maybeUnlock = (id: string, condition: boolean) => {
    if (!condition || existing.has(id)) return;
    existing.add(id);
    newlyUnlocked.push(id);
  };

  maybeUnlock('rookie', stats.totalPlays >= 1);
  maybeUnlock('regular', stats.totalPlays >= 25);
  maybeUnlock('veteran', stats.totalPlays >= 100);
  maybeUnlock('specialist', uniqueGamesPlayed >= 10);
  maybeUnlock('score-hunter', stats.totalScore >= 5000);
  maybeUnlock('champion', stats.totalWins >= 50);

  stats.unlockedTitles = [...existing];
  return newlyUnlocked;
}

export function applyGameEndToStats(statsInput: PortalStats, gameId: string, event: EventRecord, now = Date.now()): ProgressUpdate {
  const stats = normalizePortalStats(statsInput);
  const score = asFiniteNumber(event.score) ?? 0;
  const win = inferWin(event);

  const row = asGameStats(stats.perGame[gameId]);
  row.plays += 1;
  row.lastScore = score;
  row.bestScore = Math.max(row.bestScore, score);
  if (win) row.wins += 1;
  stats.perGame[gameId] = row;

  stats.totalPlays += 1;
  stats.totalScore += score;
  stats.totalWins += win ? 1 : 0;

  const scoreXp = Math.max(0, Math.min(SCORE_XP_CAP, Math.round(score / SCORE_XP_DIVISOR)));
  const xpGained = BASE_XP_PER_MATCH + scoreXp + (win ? WIN_BONUS_XP : 0);
  stats.xp += xpGained;

  const previousLevel = stats.level;
  stats.level = levelFromXp(stats.xp);

  const today = isoDay(now);
  if (!stats.lastPlayedOn) {
    stats.dailyStreak = 1;
  } else {
    const delta = dayDiff(stats.lastPlayedOn, today);
    if (delta === 0) {
      // keep streak unchanged for same-day sessions
    } else if (delta === 1) {
      stats.dailyStreak += 1;
    } else {
      stats.dailyStreak = 1;
    }
  }
  stats.longestStreak = Math.max(stats.longestStreak, stats.dailyStreak);
  stats.lastPlayedOn = today;

  const newTitles = unlockTitles(stats);

  return {
    next: stats,
    newTitles,
    xpGained,
    levelUp: stats.level > previousLevel
  };
}
