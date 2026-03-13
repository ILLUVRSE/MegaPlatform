export type RecommendationCandidate = {
  id: string;
  createdAt: Date | string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  editorial?: number;
  affinityBoost?: number;
  unresolvedReports?: number;
  categories?: string[];
  topics?: string[];
  relevance?: number;
};

export type RankedRecommendationCandidate = RecommendationCandidate & {
  baseScore: number;
  categories: string[];
  topics: string[];
  diversityScore?: number;
};

export type DiversityOptions = {
  categoryPenalty?: number;
  topicalSeed?: string[];
  topicalSeedWeight?: number;
  limit?: number;
};

export type RankingOptions = {
  now?: number | Date | string;
  policy?: Partial<{
    recencyHalfLifeHours: number;
    recencyWeight: number;
    unresolvedReportPenalty: number;
    categoryPenalty: number;
    topicalSeedWeight: number;
  }>;
};

export { DEFAULT_POLICY, diversifyCandidates, intraListDistance, ndcg, rankCandidates, scoreCandidate, summarizeRanking } from "./runtime/candidateGeneratorCore.mjs";
