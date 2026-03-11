import { InteractionType, Prisma, Title } from '@prisma/client';

type Weights = Record<string, number>;

function adjust(map: Weights, key: string, delta: number): Weights {
  const curr = map[key] || 0;
  map[key] = Number((curr + delta).toFixed(3));
  return map;
}

function runtimeBucket(runtime?: number | null): 'short' | 'medium' | 'long' {
  if (!runtime || runtime <= 45) return 'short';
  if (runtime <= 110) return 'medium';
  return 'long';
}

export function updatePreferenceByInteraction(
  preference: { genreWeights: Prisma.JsonValue; platformWeights: Prisma.JsonValue; runtimeWeights: Prisma.JsonValue },
  title: Title & { availability?: Array<{ platform: string }>; genres?: Array<{ genre: { tmdbGenreId: number } }> },
  interaction: InteractionType
): {
  genreWeights: Prisma.JsonObject;
  platformWeights: Prisma.JsonObject;
  runtimeWeights: Prisma.JsonObject;
} {
  const genreWeights = { ...((preference.genreWeights || {}) as Weights) };
  const platformWeights = { ...((preference.platformWeights || {}) as Weights) };
  const runtimeWeights = { ...((preference.runtimeWeights || { short: 0, medium: 0, long: 0 }) as Weights) };

  const deltaMap: Record<InteractionType, number> = {
    like: 1,
    dislike: -0.8,
    detail: 0.2,
    watchlist_add: 0.5,
    watchlist_remove: -0.2
  };

  const delta = deltaMap[interaction];

  for (const g of title.genres || []) {
    adjust(genreWeights, String(g.genre.tmdbGenreId), delta);
  }

  for (const a of title.availability || []) {
    adjust(platformWeights, a.platform, delta * 0.6);
  }

  adjust(runtimeWeights, runtimeBucket(title.runtime), delta * 0.5);

  return {
    genreWeights,
    platformWeights,
    runtimeWeights
  };
}

export function personalizationBoost(
  title: Title & { genres?: Array<{ genre: { tmdbGenreId: number } }>; availability?: Array<{ platform: string }> },
  pref?: { genreWeights: Prisma.JsonValue; platformWeights: Prisma.JsonValue; runtimeWeights: Prisma.JsonValue } | null
): number {
  if (!pref) return 0;
  const genreWeights = (pref.genreWeights || {}) as Weights;
  const platformWeights = (pref.platformWeights || {}) as Weights;
  const runtimeWeights = (pref.runtimeWeights || {}) as Weights;

  let score = 0;
  for (const g of title.genres || []) score += (genreWeights[String(g.genre.tmdbGenreId)] || 0) * 0.2;
  for (const a of title.availability || []) score += (platformWeights[a.platform] || 0) * 0.15;

  const bucket = !title.runtime || title.runtime <= 45 ? 'short' : title.runtime <= 110 ? 'medium' : 'long';
  score += (runtimeWeights[bucket] || 0) * 0.1;

  return score;
}
