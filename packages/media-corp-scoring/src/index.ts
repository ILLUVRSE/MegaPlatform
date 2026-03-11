import {
  average,
  clamp,
  type AgentPerformanceRollup,
  type Artifact,
  type ArtifactBundle,
  type ArtifactReviewScorecard,
  type CanonRecord,
  type ChannelMetricsRollup,
  type ContentMetricsRollup,
  type ContentAssetPlan,
  type FranchiseMetricsRollup,
  type FranchiseSeed,
  type GreenlightDecision,
  type PerformanceSnapshot,
  type PromptPerformanceRollup,
  type QualityScorecard,
  type ReleaseCandidate,
  type StrategyRecommendation
} from "@illuvrse/media-corp-core";

function countUniqueWords(values: string[]) {
  const words = new Set(
    values
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
  );
  return words.size;
}

export function classifyGreenlight(overall: number, legalSimilarityRisk: number): GreenlightDecision {
  if (legalSimilarityRisk >= 75 || overall < 45) return "kill";
  if (overall < 60) return "test";
  if (overall < 74) return "incubate";
  if (overall < 88) return "scale";
  return "flagship";
}

export function buildQualityScorecard(input: {
  seed: FranchiseSeed;
  canon: CanonRecord;
  contentPlans: ContentAssetPlan[];
}): QualityScorecard {
  const uniqueWordCount = countUniqueWords([
    input.seed.premise,
    input.seed.worldHook,
    input.canon.loreSummary,
    ...input.contentPlans.map((plan) => `${plan.title} ${plan.concept} ${plan.hook}`)
  ]);

  const formatCount = new Set(input.contentPlans.map((plan) => plan.format)).size;
  const toneWeight = input.seed.tone.toLowerCase().includes("epic") ? 4 : 0;
  const motifsWeight = input.seed.motifs.length * 4;
  const characterWeight = input.canon.characters.length * 6;

  const uniqueness = clamp(42 + uniqueWordCount / 2 + motifsWeight / 2);
  const visualStickiness = clamp(48 + input.canon.visualLanguage.length * 6 + toneWeight);
  const memePotential = clamp(38 + input.seed.motifs.length * 6 + formatCount * 4);
  const serializationPotential = clamp(44 + input.canon.continuityRules.length * 5 + characterWeight);
  const gamePotential = clamp(35 + (input.contentPlans.some((plan) => plan.format === "game_concept") ? 24 : 0) + characterWeight / 2);
  const soundtrackPotential = clamp(30 + (input.contentPlans.some((plan) => plan.format === "music_concept") ? 28 : 8) + input.seed.styleGuide.length * 3);
  const audienceFit = clamp(50 + input.seed.audienceTarget.channels.length * 7 + input.seed.audienceTarget.emotions.length * 4);
  const legalSimilarityRisk = clamp(18 + input.seed.legalNotes.length * 9 + Math.max(0, 18 - uniqueWordCount / 5));
  const costEffort = clamp(40 + formatCount * 7 + (input.contentPlans.some((plan) => plan.format === "movie_concept") ? 12 : 0));
  const franchiseExpandability = clamp(46 + input.canon.worldRules.length * 6 + input.canon.characters.length * 5);
  const brandFit = clamp(58 + (input.contentPlans.every((plan) => plan.canonicalAnchors.length > 0) ? 12 : 0));
  const continuityHealth = clamp(52 + input.canon.continuityRules.length * 7 - input.seed.legalNotes.length * 2);

  const overall = clamp(
    average([
      uniqueness,
      visualStickiness,
      memePotential,
      serializationPotential,
      gamePotential,
      soundtrackPotential,
      audienceFit,
      100 - legalSimilarityRisk,
      100 - costEffort / 2,
      franchiseExpandability,
      brandFit,
      continuityHealth
    ])
  );
  const decision = classifyGreenlight(overall, legalSimilarityRisk);

  return {
    id: `score_${input.seed.slug}`,
    franchiseId: input.seed.id,
    seedId: input.seed.id,
    contentPlanIds: input.contentPlans.map((plan) => plan.id),
    uniqueness,
    visualStickiness,
    memePotential,
    serializationPotential,
    gamePotential,
    soundtrackPotential,
    audienceFit,
    legalSimilarityRisk,
    costEffort,
    franchiseExpandability,
    brandFit,
    continuityHealth,
    overall,
    decision,
    rationale: [
      `Unique-word density reached ${uniqueWordCount}, supporting originality.`,
      `${formatCount} low-cost or expansion formats were planned from the same canon.`,
      `Legal risk remained ${legalSimilarityRisk}/100 after canon and motif review.`
    ],
    generatedAt: new Date().toISOString()
  };
}

export function buildArtifactReviewScorecard(input: {
  seed: FranchiseSeed;
  canon: CanonRecord;
  bundle: ArtifactBundle;
  artifacts: Artifact[];
}): ArtifactReviewScorecard {
  const canonicalCoverage = input.artifacts.filter((artifact) => artifact.lineage.some((line) => line.includes(input.seed.id))).length;
  const canonConsistency = clamp(52 + input.bundle.lineage.length * 6 + canonicalCoverage * 4);
  const originality = clamp(48 + countUniqueWords(input.artifacts.map((artifact) => artifact.brief)) / 2 - input.seed.legalNotes.length * 2);
  const brandFit = clamp(54 + input.artifacts.filter((artifact) => artifact.reviewStatus !== "pending").length * 6 + input.bundle.qualityScore / 8);
  const packageCompleteness = clamp(44 + input.artifacts.length * 9 + input.bundle.generationJobIds.length * 4);
  const duplicationRisk = clamp(18 + Math.max(0, 20 - input.artifacts.length * 2));
  const similarityRisk = clamp(Math.round(average(input.artifacts.map((artifact) => artifact.rightsSimilarityRisk))));
  const publishReadiness = clamp(
    average([
      canonConsistency,
      originality,
      brandFit,
      packageCompleteness,
      100 - duplicationRisk,
      100 - similarityRisk
    ])
  );
  const overall = clamp(
    average([canonConsistency, originality, brandFit, packageCompleteness, 100 - duplicationRisk, 100 - similarityRisk, publishReadiness])
  );
  const flags = [
    ...(similarityRisk > 45 ? ["similarity-risk"] : []),
    ...(duplicationRisk > 40 ? ["duplication-risk"] : []),
    ...(canonConsistency < 60 ? ["canon-drift"] : []),
    ...(packageCompleteness < 65 ? ["incomplete-package"] : [])
  ];

  return {
    id: `artifact_score_${input.bundle.id}`,
    franchiseId: input.seed.id,
    artifactBundleId: input.bundle.id,
    canonConsistency,
    originality,
    brandFit,
    packageCompleteness,
    duplicationRisk,
    similarityRisk,
    publishReadiness,
    overall,
    flags,
    rationale: [
      `${input.artifacts.length} artifacts were attached to the bundle.`,
      `Similarity risk landed at ${similarityRisk}/100 after prompt and lineage review.`,
      `Publish readiness scored ${publishReadiness}/100 across packaging completeness and canon fit.`
    ],
    createdAt: new Date().toISOString()
  };
}

export function recommendReleaseCandidateStatus(scorecard: ArtifactReviewScorecard, decision: "approve" | "reject" | "revise") {
  if (decision !== "approve") return "draft" as const;
  if (scorecard.publishReadiness >= 78 && scorecard.flags.length === 0) return "ready" as const;
  return "draft" as const;
}

export function calculateFranchiseMomentum(input: {
  bundleScorecards: ArtifactReviewScorecard[];
  releaseCandidates: ReleaseCandidate[];
  previousTier: GreenlightDecision;
}) {
  const readiness = average(input.bundleScorecards.map((item) => item.publishReadiness));
  const releaseCount = input.releaseCandidates.length;
  const momentum = clamp(readiness + releaseCount * 6);
  if (momentum >= 86) return "flagship" as GreenlightDecision;
  if (momentum >= 72) return "scale" as GreenlightDecision;
  if (momentum >= 58) return "incubate" as GreenlightDecision;
  if (momentum >= 45) return input.previousTier === "kill" ? "test" : input.previousTier;
  return "kill" as GreenlightDecision;
}

export function buildPerformanceSnapshotMetrics(seed = 1): PerformanceSnapshot["metrics"] {
  const impressions = 1000 + seed * 350;
  const views = Math.round(impressions * (0.42 + (seed % 3) * 0.06));
  const opens = Math.round(impressions * 0.18);
  const clicks = Math.round(opens * 0.27);
  const likes = Math.round(views * 0.12);
  const shares = Math.round(views * 0.05);
  const saves = Math.round(views * 0.04);
  const comments = Math.round(views * 0.03);
  const reposts = Math.round(views * 0.02);
  const ctr = Number((clicks / Math.max(1, impressions)).toFixed(2));
  const engagementRate = Number(((likes + shares + saves + comments + reposts) / Math.max(1, views)).toFixed(2));
  return {
    impressions,
    views,
    opens,
    clicks,
    watchTime: views * (8 + seed),
    completionRate: Number((0.41 + (seed % 4) * 0.08).toFixed(2)),
    likes,
    shares,
    saves,
    comments,
    reposts,
    ctr,
    engagementRate,
    conversionProxy: Number((0.03 + seed * 0.005).toFixed(2)),
    decayRate: Number((0.18 - Math.min(0.08, seed * 0.01)).toFixed(2)),
    audienceRetention: Number((0.36 + (seed % 4) * 0.09).toFixed(2)),
    timeToFirstEngagementMin: Math.max(3, 24 - seed * 2)
  };
}

export function buildContentMetricsRollup(params: {
  artifactBundleId: string;
  releaseCandidateId: string;
  snapshot: PerformanceSnapshot;
}): ContentMetricsRollup {
  return {
    id: `content_rollup_${params.artifactBundleId}`,
    artifactBundleId: params.artifactBundleId,
    releaseCandidateId: params.releaseCandidateId,
    metrics: params.snapshot.metrics,
    createdAt: params.snapshot.createdAt
  };
}

export function buildChannelMetricsRollup(params: { channelId: string; snapshots: PerformanceSnapshot[] }): ChannelMetricsRollup {
  const metrics = aggregateMetrics(params.snapshots.map((item) => item.metrics));
  const efficiencyScore = clamp((metrics.engagementRate * 100 + metrics.ctr * 120 + metrics.audienceRetention * 80) / 3);
  return {
    id: `channel_rollup_${params.channelId}`,
    channelId: params.channelId,
    metrics,
    efficiencyScore,
    createdAt: new Date().toISOString()
  };
}

export function buildFranchiseMetricsRollup(params: { franchiseId: string; snapshots: PerformanceSnapshot[] }): FranchiseMetricsRollup {
  const metrics = aggregateMetrics(params.snapshots.map((item) => item.metrics));
  const momentumScore = clamp((metrics.engagementRate * 100 + metrics.completionRate * 100 + metrics.conversionProxy * 160) / 3);
  return {
    id: `franchise_rollup_${params.franchiseId}`,
    franchiseId: params.franchiseId,
    metrics,
    momentumScore,
    createdAt: new Date().toISOString()
  };
}

export function buildPromptPerformanceRollup(params: {
  promptTemplateId: string;
  promptRunId?: string;
  snapshots: PerformanceSnapshot[];
}): PromptPerformanceRollup {
  const metrics = aggregateMetrics(params.snapshots.map((item) => item.metrics));
  return {
    id: `prompt_rollup_${params.promptRunId ?? params.promptTemplateId}`,
    promptTemplateId: params.promptTemplateId,
    promptRunId: params.promptRunId,
    metrics,
    winRate: clamp((metrics.engagementRate * 100 + metrics.ctr * 100) / 2),
    createdAt: new Date().toISOString()
  };
}

export function buildAgentPerformanceRollup(params: {
  agentId: AgentPerformanceRollup["agentId"];
  snapshots: PerformanceSnapshot[];
}): AgentPerformanceRollup {
  const metrics = aggregateMetrics(params.snapshots.map((item) => item.metrics));
  return {
    id: `agent_rollup_${params.agentId}`,
    agentId: params.agentId,
    metrics,
    efficiencyScore: clamp((metrics.engagementRate * 100 + metrics.audienceRetention * 100 + metrics.conversionProxy * 120) / 3),
    createdAt: new Date().toISOString()
  };
}

function aggregateMetrics(metricsList: PerformanceSnapshot["metrics"][]): PerformanceSnapshot["metrics"] {
  if (metricsList.length === 0) return buildPerformanceSnapshotMetrics(0);
  const sum = <K extends keyof PerformanceSnapshot["metrics"]>(key: K) =>
    metricsList.reduce((total, metrics) => total + Number(metrics[key] ?? 0), 0);
  return {
    impressions: sum("impressions"),
    views: sum("views"),
    opens: sum("opens"),
    clicks: sum("clicks"),
    watchTime: sum("watchTime"),
    completionRate: Number((sum("completionRate") / metricsList.length).toFixed(2)),
    likes: sum("likes"),
    shares: sum("shares"),
    saves: sum("saves"),
    comments: sum("comments"),
    reposts: sum("reposts"),
    ctr: Number((sum("ctr") / metricsList.length).toFixed(2)),
    engagementRate: Number((sum("engagementRate") / metricsList.length).toFixed(2)),
    conversionProxy: Number((sum("conversionProxy") / metricsList.length).toFixed(2)),
    decayRate: Number((sum("decayRate") / metricsList.length).toFixed(2)),
    audienceRetention: Number((sum("audienceRetention") / metricsList.length).toFixed(2)),
    timeToFirstEngagementMin: Number((sum("timeToFirstEngagementMin") / metricsList.length).toFixed(2))
  };
}

export function buildStrategyRecommendations(input: {
  franchiseRollups: FranchiseMetricsRollup[];
  channelRollups: ChannelMetricsRollup[];
  promptRollups: PromptPerformanceRollup[];
}): StrategyRecommendation[] {
  const recommendations: StrategyRecommendation[] = [];
  const topFranchise = [...input.franchiseRollups].sort((a, b) => b.momentumScore - a.momentumScore)[0];
  const weakChannel = [...input.channelRollups].sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0];
  const strongPrompt = [...input.promptRollups].sort((a, b) => b.winRate - a.winRate)[0];

  if (topFranchise) {
    recommendations.push({
      id: `rec_${topFranchise.franchiseId}_promote`,
      recommendationType: "promote_tier",
      franchiseId: topFranchise.franchiseId,
      rationale: [
        `Franchise momentum reached ${topFranchise.momentumScore}.`,
        `Engagement rate averaged ${topFranchise.metrics.engagementRate}.`
      ],
      confidence: clamp(topFranchise.momentumScore),
      action: "Promote the franchise and schedule a sequel or burst campaign.",
      createdAt: new Date().toISOString()
    });
  }

  if (weakChannel) {
    recommendations.push({
      id: `rec_${weakChannel.channelId}_suppress`,
      recommendationType: "suppress_format",
      channelId: weakChannel.channelId,
      rationale: [
        `Channel efficiency is ${weakChannel.efficiencyScore}.`,
        `CTR averaged ${weakChannel.metrics.ctr}.`
      ],
      confidence: clamp(100 - weakChannel.efficiencyScore),
      action: "Reduce low-performing channel allocations and reroute to stronger surfaces.",
      createdAt: new Date().toISOString()
    });
  }

  if (strongPrompt) {
    recommendations.push({
      id: `rec_${strongPrompt.promptTemplateId}_campaign`,
      recommendationType: "recommend_campaign",
      promptTemplateId: strongPrompt.promptTemplateId,
      rationale: [
        `Prompt win rate reached ${strongPrompt.winRate}.`,
        `Audience retention averaged ${strongPrompt.metrics.audienceRetention}.`
      ],
      confidence: clamp(strongPrompt.winRate),
      action: "Reuse this prompt template in the next targeted campaign burst.",
      createdAt: new Date().toISOString()
    });
  }

  return recommendations;
}
