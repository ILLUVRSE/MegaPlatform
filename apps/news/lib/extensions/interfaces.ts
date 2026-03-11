export interface PersonalizationScorer {
  scoreClusterForUser(userId: string, clusterId: string): Promise<number>;
}

export interface SourceReputationScorer {
  scoreSource(sourceId: string): Promise<number>;
}

export interface BiasDetector {
  detectBias(text: string): Promise<{ score: number; notes: string[] }>;
}

export interface AnalyticsTracker {
  track(event: string, payload: Record<string, string | number | boolean>): Promise<void>;
}

export interface MultiVoicePodcastMode {
  synthesize(script: string, voices: string[]): Promise<{ audioUrl: string; durationSeconds: number }>;
}
