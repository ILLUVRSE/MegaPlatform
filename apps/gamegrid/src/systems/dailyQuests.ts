import { GAME_REGISTRY } from '../registry/games';
import type { DailyQuestProgress, DailyQuestState, PortalStats } from '../types';

type QuestEvent = {
  gameId: string;
  score?: number | string | null;
  outcome?: string | null;
  winner?: string | null;
  multiplayer?: boolean;
};

type SeededRng = {
  next: () => number;
  nextInt: (min: number, max: number) => number;
};

function isoDay(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seedInput: string): SeededRng {
  let state = hashSeed(seedInput) || 1;
  return {
    next: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    nextInt: (min: number, max: number) => {
      if (max <= min) return min;
      const roll = (state = (state * 1664525 + 1013904223) >>> 0) / 0x100000000;
      return Math.floor((max - min + 1) * roll + min);
    }
  };
}

function inferWin(event: QuestEvent): boolean {
  if (event.winner === 'player' || event.winner === 'home' || event.winner === 'p1' || event.winner === 'team-a') return true;
  const outcome = event.outcome;
  if (typeof outcome === 'string') {
    const normalized = outcome.toLowerCase();
    return normalized.includes('win') || normalized.includes('victory');
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildQuestId(base: string, dayKey: string) {
  return `${base}-${dayKey}`;
}

function questFromTemplate(dayKey: string, rng: SeededRng, index: number): DailyQuestProgress {
  const pick = rng.nextInt(0, 5);
  if (pick === 0) {
    return {
      id: buildQuestId(`play-matches-${index}`, dayKey),
      name: 'Warm-Up Set',
      description: 'Play 3 matches today.',
      kind: 'play_matches',
      target: 3,
      progress: 0,
      rewardTickets: 120,
      completed: false
    };
  }
  if (pick === 1) {
    return {
      id: buildQuestId(`win-matches-${index}`, dayKey),
      name: 'Win Streak',
      description: 'Win 2 matches.',
      kind: 'win_matches',
      target: 2,
      progress: 0,
      rewardTickets: 160,
      completed: false
    };
  }
  if (pick === 2) {
    return {
      id: buildQuestId(`score-points-${index}`, dayKey),
      name: 'Scoreboard Climb',
      description: 'Score 1200 points total.',
      kind: 'score_points',
      target: 1200,
      progress: 0,
      rewardTickets: 150,
      completed: false
    };
  }
  if (pick === 3) {
    const game = GAME_REGISTRY[rng.nextInt(0, GAME_REGISTRY.length - 1)];
    return {
      id: buildQuestId(`spotlight-${game.id}-${index}`, dayKey),
      name: `${game.title} Spotlight`,
      description: `Play 2 matches in ${game.title}.`,
      kind: 'play_matches',
      target: 2,
      progress: 0,
      rewardTickets: 140,
      completed: false,
      gameId: game.id
    };
  }
  if (pick === 4) {
    return {
      id: buildQuestId(`variety-${index}`, dayKey),
      name: 'Variety Hour',
      description: 'Play 3 different games.',
      kind: 'play_variety',
      target: 3,
      progress: 0,
      rewardTickets: 170,
      completed: false,
      uniqueGameIds: []
    };
  }
  return {
    id: buildQuestId(`party-${index}`, dayKey),
    name: 'Bar Night',
    description: 'Finish 1 party match.',
    kind: 'party_match',
    target: 1,
    progress: 0,
    rewardTickets: 180,
    completed: false
  };
}

export function createDailyQuestState(dayKey: string): DailyQuestState {
  const rng = createSeededRng(`gamegrid:${dayKey}`);
  const quests: DailyQuestProgress[] = [];
  while (quests.length < 3) {
    const candidate = questFromTemplate(dayKey, rng, quests.length);
    if (quests.some((quest) => quest.name === candidate.name)) continue;
    quests.push(candidate);
  }
  return { dateKey: dayKey, quests };
}

export function ensureDailyQuests(stats: PortalStats, now = Date.now()): { next: PortalStats; refreshed: boolean } {
  const today = isoDay(now);
  if (stats.dailyQuests.dateKey === today && stats.dailyQuests.quests.length === 3) {
    return { next: stats, refreshed: false };
  }
  return {
    next: {
      ...stats,
      dailyQuests: createDailyQuestState(today)
    },
    refreshed: true
  };
}

export function applyDailyQuestProgress(
  stats: PortalStats,
  event: QuestEvent,
  now = Date.now()
): { next: PortalStats; ticketsEarned: number; completed: DailyQuestProgress[] } {
  const { next: seeded } = ensureDailyQuests(stats, now);
  const score = toNumber(event.score);
  const win = inferWin(event);
  let ticketsEarned = 0;
  const completed: DailyQuestProgress[] = [];
  const nextQuests = seeded.dailyQuests.quests.map((quest) => {
    if (quest.completed) return quest;
    if (quest.gameId && quest.gameId !== event.gameId) return quest;

    let progress = quest.progress;
    let uniqueGameIds = quest.uniqueGameIds ? [...quest.uniqueGameIds] : undefined;

    if (quest.kind === 'play_matches') {
      progress += 1;
    } else if (quest.kind === 'win_matches' && win) {
      progress += 1;
    } else if (quest.kind === 'score_points') {
      progress += score;
    } else if (quest.kind === 'play_variety') {
      if (!uniqueGameIds) uniqueGameIds = [];
      if (!uniqueGameIds.includes(event.gameId)) uniqueGameIds.push(event.gameId);
      progress = uniqueGameIds.length;
    } else if (quest.kind === 'party_match' && event.multiplayer) {
      progress += 1;
    }

    const nextQuest = {
      ...quest,
      progress: Math.min(progress, quest.target),
      uniqueGameIds
    };
    if (nextQuest.progress >= nextQuest.target) {
      nextQuest.completed = true;
      ticketsEarned += nextQuest.rewardTickets;
      completed.push(nextQuest);
    }
    return nextQuest;
  });

  const nextStats = {
    ...seeded,
    dailyQuests: {
      ...seeded.dailyQuests,
      quests: nextQuests
    },
    currency: {
      ...seeded.currency,
      tickets: seeded.currency.tickets + ticketsEarned
    }
  };

  return { next: nextStats, ticketsEarned, completed };
}
