function normalizeList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function hashSeed(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function ageBucket(createdAt, now) {
  const ageHours = Math.max(0, (new Date(now).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (ageHours <= 6) return "fresh";
  if (ageHours <= 36) return "recent";
  if (ageHours <= 120) return "catalog";
  return "archive";
}

function popularityBand(item) {
  const engagement = item.likeCount * 1.1 + item.commentCount * 1.7 + item.shareCount * 2.2;
  if (engagement >= 18) return "high";
  if (engagement >= 8) return "mid";
  return "low";
}

function candidateDistance(positive, candidate, now) {
  const positiveCategories = new Set(normalizeList(positive.categories));
  const positiveTopics = new Set(normalizeList(positive.topics));
  const candidateCategories = normalizeList(candidate.categories);
  const candidateTopics = normalizeList(candidate.topics);
  const categoryOverlap = candidateCategories.reduce((sum, value) => sum + (positiveCategories.has(value) ? 1 : 0), 0);
  const topicOverlap = candidateTopics.reduce((sum, value) => sum + (positiveTopics.has(value) ? 1 : 0), 0);
  const sameAgeBucket = ageBucket(positive.createdAt, now) === ageBucket(candidate.createdAt, now) ? 1 : 0;
  const samePopularityBand = popularityBand(positive) === popularityBand(candidate) ? 1 : 0;

  return {
    score: categoryOverlap * 2 + topicOverlap * 1.5 + sameAgeBucket * 0.75 + samePopularityBand * 0.5,
    categoryOverlap,
    topicOverlap
  };
}

export function generateNegativeSamples(events, inventory, options = {}) {
  const now = options.now ?? Date.now();
  const negativesPerPositive = options.negativesPerPositive ?? 2;
  const rng = createRng(options.seed ?? "recommendation-negative-sampling");
  const positives = events.filter((event) => event.engaged);
  const interacted = new Set(events.map((event) => event.itemId));

  return positives.flatMap((positiveEvent) => {
    const positive = inventory.find((item) => item.id === positiveEvent.itemId);
    if (!positive) return [];

    const pool = inventory
      .filter((candidate) => !interacted.has(candidate.id))
      .map((candidate) => ({
        item: candidate,
        ...candidateDistance(positive, candidate, now)
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || String(left.item.id).localeCompare(String(right.item.id)));

    const contextualPool = pool.filter((entry) => entry.categoryOverlap > 0 || entry.topicOverlap > 0);
    const fallbackPool = pool.filter((entry) => entry.categoryOverlap === 0 && entry.topicOverlap === 0);
    const orderedPool = contextualPool.length >= negativesPerPositive ? contextualPool : [...contextualPool, ...fallbackPool];

    const chosen = [];
    const seen = new Set();
    while (chosen.length < negativesPerPositive && orderedPool.length > 0) {
      const highestScore = orderedPool[0]?.score ?? 0;
      const tiedFrontier = orderedPool.filter((entry) => entry.score === highestScore);
      const picked = tiedFrontier[Math.floor(rng() * tiedFrontier.length)] ?? orderedPool[0];
      orderedPool.splice(orderedPool.findIndex((entry) => entry.item.id === picked.item.id), 1);
      if (seen.has(picked.item.id)) continue;
      seen.add(picked.item.id);
      chosen.push({
        positiveId: positive.id,
        negativeId: picked.item.id,
        realismScore: Number(picked.score.toFixed(4)),
        reason: {
          categoryOverlap: normalizeList(picked.item.categories).filter((value) => normalizeList(positive.categories).includes(value)),
          topicOverlap: normalizeList(picked.item.topics).filter((value) => normalizeList(positive.topics).includes(value)),
          ageBucket: ageBucket(picked.item.createdAt, now),
          popularityBand: popularityBand(picked.item)
        }
      });
    }

    return chosen;
  });
}
