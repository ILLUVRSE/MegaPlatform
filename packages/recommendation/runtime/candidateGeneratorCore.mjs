const DEFAULT_POLICY = {
  recencyHalfLifeHours: 18,
  recencyWeight: 6,
  unresolvedReportPenalty: 1.2,
  freshnessDecaySchedule: [
    { maxAgeHours: 6, multiplier: 1.12 },
    { maxAgeHours: 24, multiplier: 1 },
    { maxAgeHours: 72, multiplier: 0.72 },
    { maxAgeHours: 168, multiplier: 0.42 },
    { maxAgeHours: Number.POSITIVE_INFINITY, multiplier: 0.22 }
  ],
  surgeWindowHours: 8,
  surgeVelocityThreshold: 3.2,
  surgeEngagementThreshold: 8,
  surgeBoost: 3.5,
  lowQualityMinEngagement: 4,
  rapidPostWindowHours: 2,
  lowQualityFreshnessCap: 1.4,
  categoryPenalty: 2.4,
  topicalSeedWeight: 1.4
};

function normalizeList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
}

function toTimestamp(now) {
  return now instanceof Date ? now.getTime() : new Date(now).getTime();
}

function engagementScore(item) {
  return item.likeCount * 1.1 + item.commentCount * 1.7 + item.shareCount * 2.2;
}

function ageHours(now, createdAt) {
  return Math.max(0, (toTimestamp(now) - new Date(createdAt).getTime()) / (1000 * 60 * 60));
}

function freshnessScore(item, now, policy = DEFAULT_POLICY) {
  const age = ageHours(now, item.createdAt);
  const engagement = engagementScore(item);
  const decayMultiplier = policy.freshnessDecaySchedule.find((entry) => age <= entry.maxAgeHours)?.multiplier ?? 1;
  const baseRecency = Math.exp(-age / policy.recencyHalfLifeHours) * policy.recencyWeight * decayMultiplier;
  const velocity = engagement / Math.max(1, age);
  const qualifiesForSurge =
    age <= policy.surgeWindowHours &&
    engagement >= policy.surgeEngagementThreshold &&
    velocity >= policy.surgeVelocityThreshold;
  const lowQualityRapidPost = age <= policy.rapidPostWindowHours && engagement < policy.lowQualityMinEngagement;
  const surge = qualifiesForSurge ? Math.min(1.75, velocity / policy.surgeVelocityThreshold) * policy.surgeBoost : 0;
  const uncapped = baseRecency + (lowQualityRapidPost ? 0 : surge);
  return lowQualityRapidPost ? Math.min(uncapped, policy.lowQualityFreshnessCap) : uncapped;
}

export function scoreCandidate(item, now, policy = DEFAULT_POLICY) {
  const categories = normalizeList(item.categories);
  const topics = normalizeList(item.topics);

  return {
    ...item,
    createdAt: new Date(item.createdAt),
    categories,
    topics,
    baseScore:
      freshnessScore(item, now, policy) +
      engagementScore(item) +
      Number(item.editorial ?? 0) +
      Number(item.affinityBoost ?? 0) -
      Number(item.unresolvedReports ?? 0) * policy.unresolvedReportPenalty
  };
}

export function rankCandidates(items, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy ?? {}) };
  const now = options.now ?? Date.now();

  return items
    .map((item) => scoreCandidate(item, now, policy))
    .sort((left, right) => right.baseScore - left.baseScore || String(left.id).localeCompare(String(right.id)));
}

function seedTopicSet(items, explicitSeed) {
  if (explicitSeed?.length) {
    return new Set(normalizeList(explicitSeed));
  }

  const topicalSeed = items[0];
  return new Set([...(topicalSeed?.topics ?? []), ...(topicalSeed?.categories ?? [])]);
}

function overlapCount(values, selected) {
  let count = 0;
  for (const value of values) {
    count += selected.get(value) ?? 0;
  }
  return count;
}

export function diversifyCandidates(items, options = {}) {
  const ranked = items.map((item) => ({ ...item }));
  const selected = [];
  const remaining = [...ranked];
  const categoryCounts = new Map();
  const seedTopics = seedTopicSet(ranked, options.topicalSeed);
  const categoryPenalty = options.categoryPenalty ?? DEFAULT_POLICY.categoryPenalty;
  const topicalSeedWeight = options.topicalSeedWeight ?? DEFAULT_POLICY.topicalSeedWeight;
  const limit = Math.min(options.limit ?? ranked.length, ranked.length);

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const item = remaining[index];
      const repeatedCategoryPenalty = overlapCount(item.categories ?? [], categoryCounts) * categoryPenalty;
      const topicalSeedBonus = [...(item.topics ?? []), ...(item.categories ?? [])].reduce(
        (sum, value) => sum + (seedTopics.has(value) ? topicalSeedWeight : 0),
        0
      );
      const diversityScore = item.baseScore - repeatedCategoryPenalty + topicalSeedBonus;

      if (diversityScore > bestScore) {
        bestScore = diversityScore;
        bestIndex = index;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    selected.push({
      ...next,
      diversityScore: Number(bestScore.toFixed(4))
    });

    for (const category of next.categories ?? []) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  return selected;
}

function jaccardDistance(left, right) {
  const leftValues = new Set([...(left.categories ?? []), ...(left.topics ?? [])]);
  const rightValues = new Set([...(right.categories ?? []), ...(right.topics ?? [])]);
  const union = new Set([...leftValues, ...rightValues]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const value of leftValues) {
    if (rightValues.has(value)) intersection += 1;
  }
  return 1 - intersection / union.size;
}

export function intraListDistance(items, limit = items.length) {
  const top = items.slice(0, limit);
  if (top.length < 2) return 0;

  let total = 0;
  let pairCount = 0;
  for (let left = 0; left < top.length; left += 1) {
    for (let right = left + 1; right < top.length; right += 1) {
      total += jaccardDistance(top[left], top[right]);
      pairCount += 1;
    }
  }

  return Number((total / pairCount).toFixed(4));
}

export function ndcg(items, limit = items.length) {
  const top = items.slice(0, limit);
  const dcg = top.reduce((sum, item, index) => sum + Number(item.relevance ?? 0) / Math.log2(index + 2), 0);
  const ideal = [...top].sort((left, right) => Number(right.relevance ?? 0) - Number(left.relevance ?? 0));
  const idealDcg = ideal.reduce((sum, item, index) => sum + Number(item.relevance ?? 0) / Math.log2(index + 2), 0);
  if (idealDcg === 0) return 0;
  return Number((dcg / idealDcg).toFixed(4));
}

export function summarizeRanking(items, limit = 5) {
  return items.slice(0, limit).map((item) => item.id);
}

export { DEFAULT_POLICY };
