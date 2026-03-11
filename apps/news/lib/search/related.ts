interface RelatedCandidate {
  id: string;
  title: string;
  storyVector: number[];
  updatedAt: Date;
}

interface RankedRelatedStory {
  id: string;
  title: string;
  similarity: number;
  freshness: number;
  score: number;
}

function cosineSimilarityRaw(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const len = Math.max(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function recencyScore(updatedAt: Date, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
  return Math.exp(-ageHours / 72);
}

export function rankRelatedStories(
  queryVector: number[],
  candidates: RelatedCandidate[],
  limit: number,
  now = new Date()
): RankedRelatedStory[] {
  return candidates
    .map((candidate) => {
      const similarity = cosineSimilarityRaw(queryVector, candidate.storyVector);
      const freshness = recencyScore(candidate.updatedAt, now);
      const score = 0.85 * similarity + 0.15 * freshness;
      return {
        id: candidate.id,
        title: candidate.title,
        similarity: Number(similarity.toFixed(4)),
        freshness: Number(freshness.toFixed(4)),
        score: Number(score.toFixed(4))
      };
    })
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.score - a.score || b.similarity - a.similarity)
    .slice(0, limit);
}
