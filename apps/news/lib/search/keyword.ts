interface KeywordCandidate {
  id: string;
  title: string;
  globalScore: number;
  updatedAt: Date;
}

interface RankedKeywordCandidate extends KeywordCandidate {
  searchScore: number;
}

function recencyScore(updatedAt: Date, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
  return Math.exp(-ageHours / 96);
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

export function rankKeywordResults(
  query: string,
  candidates: KeywordCandidate[],
  now = new Date()
): RankedKeywordCandidate[] {
  const q = query.trim().toLowerCase();
  const terms = tokenizeQuery(query);

  return candidates
    .map((candidate) => {
      const title = candidate.title.toLowerCase();
      let lexical = 0;

      if (title === q) {
        lexical += 1;
      }
      if (q.length > 0 && title.startsWith(q)) {
        lexical += 0.6;
      }
      if (q.length > 0 && title.includes(q)) {
        lexical += 0.3;
      }

      if (terms.length > 0) {
        const matchedTerms = terms.filter((term) => title.includes(term)).length;
        lexical += (matchedTerms / terms.length) * 0.5;
      }

      const freshness = recencyScore(candidate.updatedAt, now);
      const normalizedClusterScore = Math.max(0, Math.min(1, candidate.globalScore));
      const score = 0.65 * lexical + 0.2 * freshness + 0.15 * normalizedClusterScore;

      return {
        ...candidate,
        searchScore: Number(score.toFixed(4))
      };
    })
    .sort((a, b) => b.searchScore - a.searchScore || b.updatedAt.getTime() - a.updatedAt.getTime());
}
