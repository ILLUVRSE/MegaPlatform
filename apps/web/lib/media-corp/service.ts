import { prisma } from "@illuvrse/db";
import { PrismaCanonRepository } from "@illuvrse/media-corp-canon";
import { PrismaMemoryStore } from "@illuvrse/media-corp-memory";
import { runMediaCorpCycle } from "@illuvrse/media-corp-orchestrator";
import type {
  DistributionChannel,
  DistributionPackage,
  MediaCorpWorldState,
  PerformanceSnapshot,
  ReleaseCandidate,
  ReviewDecisionType
} from "@illuvrse/media-corp-core";
import {
  buildAgentPerformanceRollup,
  buildChannelMetricsRollup,
  buildContentMetricsRollup,
  buildFranchiseMetricsRollup,
  buildPromptPerformanceRollup,
  buildStrategyRecommendations
} from "@illuvrse/media-corp-scoring";

type DashboardData = {
  worldState: MediaCorpWorldState;
  memory: Array<{
    id: string;
    franchiseId?: string;
    agentId?: string;
    kind: string;
    key: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
};

function emptyWorldState(): MediaCorpWorldState {
  return {
    generatedAt: new Date().toISOString(),
    trendBriefs: [],
    seeds: [],
    franchises: [],
    canonRecords: [],
    contentPlans: [],
    distributionChannels: [],
    publishTargets: [],
    publishWindows: [],
    publishAttempts: [],
    publishResults: [],
    audienceSegments: [],
    campaigns: [],
    campaignItems: [],
    experimentAssignments: [],
    performanceEvents: [],
    performanceSnapshots: [],
    contentMetricsRollups: [],
    channelMetricsRollups: [],
    franchiseMetricsRollups: [],
    promptPerformanceRollups: [],
    agentPerformanceRollups: [],
    strategyRecommendations: [],
    promptTemplates: [],
    promptRuns: [],
    generationJobs: [],
    artifacts: [],
    artifactVersions: [],
    artifactBundles: [],
    artifactReviewScorecards: [],
    reviewDecisions: [],
    releaseCandidates: [],
    distributionPackages: [],
    scorecards: [],
    publishPlans: [],
    performanceReports: [],
    agentTasks: [],
    agentRuns: [],
    strategicGoals: [],
    goalConflicts: [],
    goalEvaluations: [],
    goalPriorityProfiles: [],
    budgets: [],
    budgetAllocations: [],
    resourcePools: [],
    capacityWindows: [],
    spendEvents: [],
    allocationDecisions: [],
    budgetGuardrails: [],
    planningCycles: [],
    executivePlans: [],
    planObjectives: [],
    planDirectives: [],
    planAssignments: [],
    planDecisions: [],
    planOutcomeExpectations: [],
    governancePolicies: [],
    approvalRules: [],
    decisionGuardrails: [],
    escalationRules: [],
    policyViolations: [],
    manualOverrides: [],
    freezeWindows: [],
    decisionLogs: [],
    decisionInputSnapshots: [],
    decisionReasons: [],
    alternativesConsidered: [],
    confidenceAssessments: [],
    expectedImpacts: [],
    postHocEvaluations: [],
    forecasts: [],
    executiveSummaries: [],
    autonomyMode: "manual_only",
    portfolioSummary: {
      kill: 0,
      test: 0,
      incubate: 0,
      scale: 0,
      flagship: 0
    }
  };
}

function normalizeWorldState(worldState: MediaCorpWorldState | undefined): MediaCorpWorldState {
  const base = emptyWorldState();
  return {
    ...base,
    ...(worldState ?? {}),
    trendBriefs: worldState?.trendBriefs ?? base.trendBriefs,
    seeds: worldState?.seeds ?? base.seeds,
    franchises: worldState?.franchises ?? base.franchises,
    canonRecords: worldState?.canonRecords ?? base.canonRecords,
    contentPlans: worldState?.contentPlans ?? base.contentPlans,
    distributionChannels: worldState?.distributionChannels ?? base.distributionChannels,
    publishTargets: worldState?.publishTargets ?? base.publishTargets,
    publishWindows: worldState?.publishWindows ?? base.publishWindows,
    publishAttempts: worldState?.publishAttempts ?? base.publishAttempts,
    publishResults: worldState?.publishResults ?? base.publishResults,
    audienceSegments: worldState?.audienceSegments ?? base.audienceSegments,
    campaigns: worldState?.campaigns ?? base.campaigns,
    campaignItems: worldState?.campaignItems ?? base.campaignItems,
    experimentAssignments: worldState?.experimentAssignments ?? base.experimentAssignments,
    performanceEvents: worldState?.performanceEvents ?? base.performanceEvents,
    performanceSnapshots: worldState?.performanceSnapshots ?? base.performanceSnapshots,
    contentMetricsRollups: worldState?.contentMetricsRollups ?? base.contentMetricsRollups,
    channelMetricsRollups: worldState?.channelMetricsRollups ?? base.channelMetricsRollups,
    franchiseMetricsRollups: worldState?.franchiseMetricsRollups ?? base.franchiseMetricsRollups,
    promptPerformanceRollups: worldState?.promptPerformanceRollups ?? base.promptPerformanceRollups,
    agentPerformanceRollups: worldState?.agentPerformanceRollups ?? base.agentPerformanceRollups,
    strategyRecommendations: worldState?.strategyRecommendations ?? base.strategyRecommendations,
    promptTemplates: worldState?.promptTemplates ?? base.promptTemplates,
    promptRuns: worldState?.promptRuns ?? base.promptRuns,
    generationJobs: worldState?.generationJobs ?? base.generationJobs,
    artifacts: worldState?.artifacts ?? base.artifacts,
    artifactVersions: worldState?.artifactVersions ?? base.artifactVersions,
    artifactBundles: worldState?.artifactBundles ?? base.artifactBundles,
    artifactReviewScorecards: worldState?.artifactReviewScorecards ?? base.artifactReviewScorecards,
    reviewDecisions: worldState?.reviewDecisions ?? base.reviewDecisions,
    releaseCandidates: worldState?.releaseCandidates ?? base.releaseCandidates,
    distributionPackages: worldState?.distributionPackages ?? base.distributionPackages,
    scorecards: worldState?.scorecards ?? base.scorecards,
    publishPlans: worldState?.publishPlans ?? base.publishPlans,
    performanceReports: worldState?.performanceReports ?? base.performanceReports,
    agentTasks: worldState?.agentTasks ?? base.agentTasks,
    agentRuns: worldState?.agentRuns ?? base.agentRuns,
    strategicGoals: worldState?.strategicGoals ?? base.strategicGoals,
    goalConflicts: worldState?.goalConflicts ?? base.goalConflicts,
    goalEvaluations: worldState?.goalEvaluations ?? base.goalEvaluations,
    goalPriorityProfiles: worldState?.goalPriorityProfiles ?? base.goalPriorityProfiles,
    budgets: worldState?.budgets ?? base.budgets,
    budgetAllocations: worldState?.budgetAllocations ?? base.budgetAllocations,
    resourcePools: worldState?.resourcePools ?? base.resourcePools,
    capacityWindows: worldState?.capacityWindows ?? base.capacityWindows,
    spendEvents: worldState?.spendEvents ?? base.spendEvents,
    allocationDecisions: worldState?.allocationDecisions ?? base.allocationDecisions,
    budgetGuardrails: worldState?.budgetGuardrails ?? base.budgetGuardrails,
    planningCycles: worldState?.planningCycles ?? base.planningCycles,
    executivePlans: worldState?.executivePlans ?? base.executivePlans,
    planObjectives: worldState?.planObjectives ?? base.planObjectives,
    planDirectives: worldState?.planDirectives ?? base.planDirectives,
    planAssignments: worldState?.planAssignments ?? base.planAssignments,
    planDecisions: worldState?.planDecisions ?? base.planDecisions,
    planOutcomeExpectations: worldState?.planOutcomeExpectations ?? base.planOutcomeExpectations,
    governancePolicies: worldState?.governancePolicies ?? base.governancePolicies,
    approvalRules: worldState?.approvalRules ?? base.approvalRules,
    decisionGuardrails: worldState?.decisionGuardrails ?? base.decisionGuardrails,
    escalationRules: worldState?.escalationRules ?? base.escalationRules,
    policyViolations: worldState?.policyViolations ?? base.policyViolations,
    manualOverrides: worldState?.manualOverrides ?? base.manualOverrides,
    freezeWindows: worldState?.freezeWindows ?? base.freezeWindows,
    decisionLogs: worldState?.decisionLogs ?? base.decisionLogs,
    decisionInputSnapshots: worldState?.decisionInputSnapshots ?? base.decisionInputSnapshots,
    decisionReasons: worldState?.decisionReasons ?? base.decisionReasons,
    alternativesConsidered: worldState?.alternativesConsidered ?? base.alternativesConsidered,
    confidenceAssessments: worldState?.confidenceAssessments ?? base.confidenceAssessments,
    expectedImpacts: worldState?.expectedImpacts ?? base.expectedImpacts,
    postHocEvaluations: worldState?.postHocEvaluations ?? base.postHocEvaluations,
    forecasts: worldState?.forecasts ?? base.forecasts,
    executiveSummaries: worldState?.executiveSummaries ?? base.executiveSummaries,
    autonomyMode: worldState?.autonomyMode ?? base.autonomyMode,
    portfolioSummary: worldState?.portfolioSummary ?? base.portfolioSummary
  };
}

export async function ensureMediaCorpDemoState() {
  const db = prisma as any;
  const latestSnapshot = (await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined;
  if (latestSnapshot?.artifactBundles?.length && latestSnapshot?.distributionChannels?.length && latestSnapshot?.publishAttempts?.length) return;

  // The dashboard uses seeded synthetic state when no prior cycle snapshot exists.
  await runMediaCorpCycle({
    repository: new PrismaCanonRepository(prisma),
    memoryStore: new PrismaMemoryStore(prisma)
  });
}

export async function getMediaCorpDashboardData(): Promise<DashboardData> {
  await ensureMediaCorpDemoState();
  const db = prisma as any;

  const [snapshot, memory] = await Promise.all([
    db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }),
    db.mediaMemoryEntry.findMany({ orderBy: { createdAt: "desc" }, take: 24 })
  ]);

  return {
    worldState: normalizeWorldState(snapshot?.payload as MediaCorpWorldState | undefined),
    memory: memory.map((entry) => ({
      id: entry.externalId,
      franchiseId: entry.franchiseExternalId ?? undefined,
      agentId: entry.agentId ?? undefined,
      kind: entry.kind,
      key: entry.key,
      payload: entry.payload as Record<string, unknown>,
      createdAt: entry.createdAt.toISOString()
    }))
  };
}

export async function triggerMediaCorpCycle() {
  return runMediaCorpCycle({
    repository: new PrismaCanonRepository(prisma),
    memoryStore: new PrismaMemoryStore(prisma)
  });
}

async function saveSnapshot(worldState: MediaCorpWorldState) {
  await new PrismaCanonRepository(prisma).saveCycle(worldState);
  return getMediaCorpDashboardData();
}

export async function reviewArtifactBundle(input: {
  artifactBundleId: string;
  decision: ReviewDecisionType;
  reviewer?: string;
  notes?: string;
}) {
  const db = prisma as any;
  const snapshot = normalizeWorldState((await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined);
  if (!snapshot) {
    return getMediaCorpDashboardData();
  }

  const now = new Date().toISOString();
  const review = snapshot.reviewDecisions.find((item) => item.artifactBundleId === input.artifactBundleId);
  if (review) {
    review.decision = input.decision;
    review.notes = input.notes ?? review.notes;
    review.reviewer = input.reviewer ?? review.reviewer;
    review.createdAt = now;
  }

  const bundle = snapshot.artifactBundles.find((item) => item.id === input.artifactBundleId);
  if (bundle) {
    bundle.reviewStatus = input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "revise";
    bundle.status = input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "in_review";
    bundle.updatedAt = now;
  }

  snapshot.artifacts = snapshot.artifacts.map((artifact) =>
    artifact.artifactBundleId === input.artifactBundleId
      ? {
          ...artifact,
          reviewStatus: input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "revise",
          status: input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "in_review",
          updatedAt: now
        }
      : artifact
  );

  return saveSnapshot(snapshot);
}

export async function promoteReleaseCandidate(input: { releaseCandidateId: string; status?: ReleaseCandidate["status"] }) {
  const db = prisma as any;
  const snapshot = normalizeWorldState((await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined);
  if (!snapshot) {
    return getMediaCorpDashboardData();
  }

  const now = new Date().toISOString();
  const candidate = snapshot.releaseCandidates.find((item) => item.id === input.releaseCandidateId);
  if (candidate) {
    candidate.status = input.status ?? "scheduled";
  }
  const distribution = snapshot.distributionPackages.find((item) => item.releaseCandidateId === input.releaseCandidateId);
  if (distribution) {
    distribution.publishTimingRecommendation = candidate?.status === "published" ? "Published to target surface." : distribution.publishTimingRecommendation;
  }

  return saveSnapshot(snapshot);
}

export function createReleaseCandidateFromBundle(input: {
  worldState: MediaCorpWorldState;
  artifactBundleId: string;
}): { releaseCandidate: ReleaseCandidate; distributionPackage: DistributionPackage } | null {
  const bundle = input.worldState.artifactBundles.find((item) => item.id === input.artifactBundleId);
  if (!bundle) return null;
  const existing = input.worldState.releaseCandidates.find((item) => item.artifactBundleId === bundle.id);
  if (existing) {
    const distribution = input.worldState.distributionPackages.find((item) => item.releaseCandidateId === existing.id);
    if (!distribution) return null;
    return { releaseCandidate: existing, distributionPackage: distribution };
  }
  return null;
}

export async function updateDistributionChannel(input: {
  channelId: string;
  status?: DistributionChannel["status"];
  description?: string;
}) {
  const db = prisma as any;
  const snapshot = normalizeWorldState((await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined);
  const channel = snapshot.distributionChannels.find((item) => item.id === input.channelId);
  if (channel) {
    if (input.status) channel.status = input.status;
    if (input.description) channel.description = input.description;
    channel.updatedAt = new Date().toISOString();
  }
  return saveSnapshot(snapshot);
}

export async function triggerSandboxPublish(input: { releaseCandidateId: string }) {
  const db = prisma as any;
  const snapshot = normalizeWorldState((await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined);
  const release = snapshot.releaseCandidates.find((item) => item.id === input.releaseCandidateId);
  if (!release) return getMediaCorpDashboardData();
  const sandboxChannel = snapshot.distributionChannels.find((item) => item.type === "sandbox_demo") ?? snapshot.distributionChannels[0];
  const target = snapshot.publishTargets.find((item) => item.channelId === sandboxChannel?.id);
  const distribution = snapshot.distributionPackages.find((item) => item.releaseCandidateId === release.id);
  if (!sandboxChannel || !target || !distribution) return getMediaCorpDashboardData();
  const now = new Date().toISOString();
  const attemptId = `manual_publish_${release.id}_${Date.now()}`;
  const resultId = `manual_result_${release.id}_${Date.now()}`;
  snapshot.publishAttempts.unshift({
    id: attemptId,
    releaseCandidateId: release.id,
    distributionPackageId: distribution.id,
    channelId: sandboxChannel.id,
    publishTargetId: target.id,
    publishWindowId: snapshot.publishWindows.find((item) => item.channelId === sandboxChannel.id)?.id,
    status: "published",
    mode: "sandbox",
    scheduledFor: now,
    executedAt: now,
    resultId,
    adapterKey: "sandbox-adapter-v1",
    createdAt: now,
    updatedAt: now
  });
  snapshot.publishResults.unshift({
    id: resultId,
    publishAttemptId: attemptId,
    placementId: `manual_${release.id}`,
    externalId: `manual_${release.id}`,
    permalink: `/sandbox/media-corp/${release.id}`,
    slug: release.packageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    publishedAt: now,
    status: "published",
    previewPayload: { channel: sandboxChannel.slug, title: release.packageTitle }
  });
  release.status = "published";
  return saveSnapshot(snapshot);
}

export async function ingestMetrics(input: {
  releaseCandidateId: string;
  channelId: string;
  metrics: PerformanceSnapshot["metrics"];
}) {
  const db = prisma as any;
  const snapshot = normalizeWorldState((await db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } }))?.payload as MediaCorpWorldState | undefined);
  const release = snapshot.releaseCandidates.find((item) => item.id === input.releaseCandidateId);
  const attempt = snapshot.publishAttempts.find((item) => item.releaseCandidateId === input.releaseCandidateId && item.channelId === input.channelId);
  if (!release || !attempt) return getMediaCorpDashboardData();
  const bundleId = release.artifactBundleId;
  const now = new Date().toISOString();
  const snapshotId = `manual_snapshot_${attempt.id}_${Date.now()}`;
  const perfSnapshot: PerformanceSnapshot = {
    id: snapshotId,
    publishAttemptId: attempt.id,
    releaseCandidateId: release.id,
    franchiseId: release.franchiseId,
    channelId: input.channelId,
    metrics: input.metrics,
    createdAt: now
  };
  snapshot.performanceSnapshots.unshift(perfSnapshot);
  snapshot.performanceEvents.push(
    {
      id: `${snapshotId}_impressions`,
      publishAttemptId: attempt.id,
      releaseCandidateId: release.id,
      franchiseId: release.franchiseId,
      channelId: input.channelId,
      artifactBundleId: bundleId,
      type: "impression",
      value: input.metrics.impressions,
      occurredAt: now
    },
    {
      id: `${snapshotId}_clicks`,
      publishAttemptId: attempt.id,
      releaseCandidateId: release.id,
      franchiseId: release.franchiseId,
      channelId: input.channelId,
      artifactBundleId: bundleId,
      type: "click",
      value: input.metrics.clicks,
      occurredAt: now
    }
  );
  snapshot.contentMetricsRollups = snapshot.contentMetricsRollups.filter((item) => item.releaseCandidateId !== release.id);
  snapshot.contentMetricsRollups.unshift(buildContentMetricsRollup({ artifactBundleId: bundleId, releaseCandidateId: release.id, snapshot: perfSnapshot }));
  const channelSnapshots = snapshot.performanceSnapshots.filter((item) => item.channelId === input.channelId);
  snapshot.channelMetricsRollups = snapshot.channelMetricsRollups.filter((item) => item.channelId !== input.channelId);
  snapshot.channelMetricsRollups.unshift(buildChannelMetricsRollup({ channelId: input.channelId, snapshots: channelSnapshots }));
  const franchiseSnapshots = snapshot.performanceSnapshots.filter((item) => item.franchiseId === release.franchiseId);
  snapshot.franchiseMetricsRollups = snapshot.franchiseMetricsRollups.filter((item) => item.franchiseId !== release.franchiseId);
  snapshot.franchiseMetricsRollups.unshift(buildFranchiseMetricsRollup({ franchiseId: release.franchiseId, snapshots: franchiseSnapshots }));
  const promptRuns = snapshot.promptRuns.filter((item) => item.artifactBundleId === bundleId);
  for (const promptRun of promptRuns) {
    const runSnapshots = snapshot.performanceSnapshots.filter((item) => item.releaseCandidateId === release.id);
    snapshot.promptPerformanceRollups = snapshot.promptPerformanceRollups.filter((item) => item.promptRunId !== promptRun.id);
    snapshot.promptPerformanceRollups.unshift(buildPromptPerformanceRollup({ promptTemplateId: promptRun.templateId, promptRunId: promptRun.id, snapshots: runSnapshots }));
  }
  snapshot.agentPerformanceRollups = snapshot.agentPerformanceRollups.filter((item) => item.agentId !== "chief_growth_officer_agent");
  snapshot.agentPerformanceRollups.unshift(
    buildAgentPerformanceRollup({
      agentId: "chief_growth_officer_agent",
      snapshots: snapshot.performanceSnapshots
    })
  );
  snapshot.strategyRecommendations = buildStrategyRecommendations({
    franchiseRollups: snapshot.franchiseMetricsRollups,
    channelRollups: snapshot.channelMetricsRollups,
    promptRollups: snapshot.promptPerformanceRollups
  });
  const franchise = snapshot.franchises.find((item) => item.id === release.franchiseId);
  const franchiseRollup = snapshot.franchiseMetricsRollups.find((item) => item.franchiseId === release.franchiseId);
  if (franchise && franchiseRollup) {
    franchise.tier = franchiseRollup.momentumScore >= 84 ? "flagship" : franchiseRollup.momentumScore >= 70 ? "scale" : franchiseRollup.momentumScore >= 56 ? "incubate" : "test";
    franchise.status = franchise.tier;
    franchise.updatedAt = now;
  }
  return saveSnapshot(snapshot);
}

export function summarizeExecutiveState(worldState: MediaCorpWorldState) {
  const topFranchise = [...worldState.franchiseMetricsRollups].sort((a, b) => b.momentumScore - a.momentumScore)[0];
  const topChannel = [...worldState.channelMetricsRollups].sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];
  const topPrompt = [...worldState.promptPerformanceRollups].sort((a, b) => b.winRate - a.winRate)[0];
  return {
    topFranchise,
    topChannel,
    topPrompt,
    recommendationCount: worldState.strategyRecommendations.length
  };
}
