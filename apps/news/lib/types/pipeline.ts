export type IngestJob = { sourceId: string; rssUrl: string };
export type CanonicalizeJob = { articleId: string; url: string; extractedText: string };
export type ClusterJob = { articleId: string; canonicalUrl: string; contentHash: string };
export type SummarizeJob = { clusterId: string };
export type EvaluateJob = { entityType: 'cluster' | 'summary' | 'ranking'; clusterId?: string; topIds?: string[] };
export type RankJob = { clusterId: string };
export type SourceReputationJob = Record<string, never>;
export type PersonalizationJob = Record<string, never>;
export type ExperimentEvaluationJob = Record<string, never>;
export type PodcastScriptJob = {
  showType:
    | 'daily_global'
    | 'daily_vertical'
    | 'daily_local'
    | 'deep_dive'
    | 'weekly_global'
    | 'weekly_vertical'
    | 'weekly_local';
};
export type TtsJob = { episodeId: string; script: string; segments?: Array<{ speaker: string; text: string }>; voices?: string[] };
export type RssPublishJob = { showType: 'daily_global' | 'daily_vertical' | 'daily_local' };
export type WeeklyDigestJob = Record<string, never>;
