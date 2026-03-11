import rawAchievements from '../../content/goalie-gauntlet-achievements.json';

export type AchievementType = 'perfect_total' | 'clean_sheet' | 'rebound_saves' | 'ranked_tier' | 'saves_total';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  badge: string;
  type: AchievementType;
  target: number;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Legendary';
}

export interface AchievementCatalog {
  achievements: AchievementDefinition[];
}

export interface AchievementRuntimeStats {
  lifetimePerfectSaves: number;
  lifetimeSaves: number;
  lifetimeReboundSaves: number;
  rankedTier: 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Legendary';
  matchGoalsAllowed: number;
}

export function loadAchievementCatalog(): AchievementCatalog {
  const parsed = rawAchievements as unknown;
  if (!Array.isArray(parsed)) throw new Error('goalie-gauntlet-achievements.json must export array');
  const achievements = parsed.filter((entry): entry is AchievementDefinition => {
    const rec = entry as Record<string, unknown>;
    return (
      typeof rec.id === 'string' &&
      typeof rec.name === 'string' &&
      typeof rec.description === 'string' &&
      typeof rec.badge === 'string' &&
      (rec.type === 'perfect_total' || rec.type === 'clean_sheet' || rec.type === 'rebound_saves' || rec.type === 'ranked_tier' || rec.type === 'saves_total') &&
      typeof rec.target === 'number'
    );
  });

  if (achievements.length < 5) throw new Error('goalie-gauntlet-achievements.json requires at least 5 achievements');
  return { achievements };
}

function tierAtLeast(current: string, required: string): boolean {
  const order = ['Bronze', 'Silver', 'Gold', 'Elite', 'Legendary'];
  return order.indexOf(current) >= order.indexOf(required);
}

export function evaluateAchievements(
  catalog: AchievementCatalog,
  alreadyUnlocked: Record<string, boolean>,
  stats: AchievementRuntimeStats
): { unlocked: Record<string, boolean>; newlyUnlocked: string[]; badges: string[] } {
  const unlocked = { ...alreadyUnlocked };
  const newlyUnlocked: string[] = [];
  const badges: string[] = [];

  for (let i = 0; i < catalog.achievements.length; i += 1) {
    const achievement = catalog.achievements[i];
    if (unlocked[achievement.id]) {
      badges.push(achievement.badge);
      continue;
    }

    let pass = false;
    if (achievement.type === 'perfect_total') pass = stats.lifetimePerfectSaves >= achievement.target;
    if (achievement.type === 'clean_sheet') pass = stats.matchGoalsAllowed <= 0;
    if (achievement.type === 'rebound_saves') pass = stats.lifetimeReboundSaves >= achievement.target;
    if (achievement.type === 'ranked_tier') pass = tierAtLeast(stats.rankedTier, achievement.tier ?? 'Gold');
    if (achievement.type === 'saves_total') pass = stats.lifetimeSaves >= achievement.target;

    if (pass) {
      unlocked[achievement.id] = true;
      newlyUnlocked.push(achievement.id);
      badges.push(achievement.badge);
    }
  }

  return {
    unlocked,
    newlyUnlocked,
    badges
  };
}
