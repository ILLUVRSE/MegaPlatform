import {
  DEFAULT_AUDIENCE_SEGMENTS,
  DEFAULT_DISTRIBUTION_CHANNELS,
  MEDIA_CORP_AGENT_ROSTER,
  PROMPT_TEMPLATE_REGISTRY,
  SAMPLE_TREND_BRIEFS,
  createId,
  type AgentPerformanceRollup,
  type AgentRun,
  type AgentTask,
  type Artifact,
  type ArtifactBundle,
  type ArtifactReviewScorecard,
  type ArtifactVersion,
  type AudienceSegment,
  type Campaign,
  type CampaignItem,
  type CanonRecord,
  type ChannelMetricsRollup,
  type ContentMetricsRollup,
  type DistributionChannel,
  type DistributionPackage,
  type ExperimentAssignment,
  type Franchise,
  type FranchiseMetricsRollup,
  type FranchiseSeed,
  type GenerationJob,
  type MediaCorpCycleResult,
  type MediaCorpWorldState,
  type PerformanceEvent,
  type PerformanceReport,
  type PerformanceSnapshot,
  type PromptPerformanceRollup,
  type PromptRun,
  type PublishAttempt,
  type PublishResult,
  type PublishTarget,
  type PublishWindow,
  type ReleaseCandidate,
  type ReviewDecision,
  type StrategyRecommendation,
  type TrendBrief
} from "@illuvrse/media-corp-core";
import { InMemoryCanonRepository, type CanonRepository } from "@illuvrse/media-corp-canon";
import { InMemoryMemoryStore, type MemoryStore } from "@illuvrse/media-corp-memory";
import {
  createReleaseCandidate,
  createReviewDecision,
  runCanonArchivist,
  runCharacterFoundry,
  runContentStudio,
  runProductionBundles,
  runPublishing,
  runTrendScout,
  runUniverseArchitect
} from "@illuvrse/media-corp-agents";
import {
  buildAgentPerformanceRollup,
  buildArtifactReviewScorecard,
  buildChannelMetricsRollup,
  buildContentMetricsRollup,
  buildFranchiseMetricsRollup,
  buildPerformanceSnapshotMetrics,
  buildPromptPerformanceRollup,
  buildQualityScorecard,
  buildStrategyRecommendations,
  calculateFranchiseMomentum,
  recommendReleaseCandidateStatus
} from "@illuvrse/media-corp-scoring";
import { CORE_MEDIA_CORP_WORKFLOW } from "@illuvrse/media-corp-workflows";

function buildTask(agentId: AgentTask["agentId"], stageId: string, output: Record<string, unknown>, now: string): AgentTask {
  const agent = MEDIA_CORP_AGENT_ROSTER.find((item) => item.id === agentId);
  return {
    id: createId("task", `${agentId}_${stageId}_${now}`),
    agentId,
    division: agent?.division ?? "board",
    workflowId: "media_corp_v3",
    stageId,
    status: "completed",
    priority: 3,
    input: {},
    output,
    createdAt: now,
    updatedAt: now
  };
}

function buildRun(task: AgentTask, summary: string, payload: Record<string, unknown>, now: string): AgentRun {
  return {
    id: createId("run", `${task.id}_${task.agentId}`),
    agentId: task.agentId,
    taskId: task.id,
    workflowId: task.workflowId,
    status: "succeeded",
    summary,
    payload,
    startedAt: now,
    endedAt: now
  };
}

function buildFranchise(seed: FranchiseSeed, canon: CanonRecord, decision: Franchise["tier"], performanceHistory: PerformanceReport[]): Franchise {
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    tagline: `${seed.motifs[0]} against the old order.`,
    status: decision,
    tier: decision,
    premise: seed.premise,
    worldSummary: canon.loreSummary,
    tone: seed.tone,
    audienceTarget: seed.audienceTarget,
    performanceHistory,
    legalNotes: seed.legalNotes,
    createdAt: seed.createdAt,
    updatedAt: new Date().toISOString()
  };
}

function buildPerformanceReport(franchiseId: string, contentPlanId: string | undefined, score: number, now: string): PerformanceReport {
  return {
    id: createId("perf", `${franchiseId}_${contentPlanId ?? "bundle"}`),
    franchiseId,
    contentPlanId,
    reach: score * 1000,
    engagementRate: Number((score / 100).toFixed(2)),
    saveRate: Number((Math.max(0.08, score / 180)).toFixed(2)),
    watchIntent: Math.round(score * 0.9),
    franchiseLift: Math.round(score * 0.85),
    retentionSignal: Math.round(score * 0.8),
    merchSignal: Math.round(score * 0.65),
    summary: `Live distribution signals imply ${score >= 80 ? "aggressive expansion" : score >= 65 ? "continued incubation" : "lightweight testing only"}.`,
    createdAt: now
  };
}

function summarizePortfolio(franchises: Franchise[]) {
  return {
    kill: franchises.filter((item) => item.tier === "kill").length,
    test: franchises.filter((item) => item.tier === "test").length,
    incubate: franchises.filter((item) => item.tier === "incubate").length,
    scale: franchises.filter((item) => item.tier === "scale").length,
    flagship: franchises.filter((item) => item.tier === "flagship").length
  };
}

export function transitionGenerationJob(job: GenerationJob, status: GenerationJob["status"], runtimeMetadata?: Record<string, unknown>): GenerationJob {
  return {
    ...job,
    status,
    runtimeMetadata: runtimeMetadata ? { ...job.runtimeMetadata, ...runtimeMetadata } : job.runtimeMetadata,
    updatedAt: new Date().toISOString()
  };
}

export function applyReviewDecisionToBundle(bundle: ArtifactBundle, bundleArtifacts: Artifact[], decision: ReviewDecision["decision"]) {
  const reviewStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "revise";
  const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "in_review";
  return {
    bundle: {
      ...bundle,
      reviewStatus,
      status,
      updatedAt: new Date().toISOString()
    },
    artifacts: bundleArtifacts.map((artifact) => ({
      ...artifact,
      reviewStatus,
      status,
      updatedAt: new Date().toISOString()
    }))
  };
}

export function advanceReleaseCandidate(candidate: ReleaseCandidate, status: ReleaseCandidate["status"]): ReleaseCandidate {
  return {
    ...candidate,
    status
  };
}

export type DistributionAdapter = {
  key: string;
  supports(channel: DistributionChannel): boolean;
  publish(input: {
    channel: DistributionChannel;
    target: PublishTarget;
    releaseCandidate: ReleaseCandidate;
    distributionPackage: DistributionPackage;
    mode: PublishAttempt["mode"];
    now: string;
  }): { attempt: PublishAttempt; result: PublishResult };
};

export const sandboxDistributionAdapter: DistributionAdapter = {
  key: "sandbox-adapter-v1",
  supports(channel) {
    return channel.type === "sandbox_demo" || channel.status === "sandbox_only";
  },
  publish({ channel, target, releaseCandidate, distributionPackage, mode, now }) {
    const attemptId = createId("publish_attempt", `${releaseCandidate.id}_${channel.id}`);
    const resultId = createId("publish_result", `${releaseCandidate.id}_${channel.id}`);
    const status = mode === "dry_run" ? "dry_run" : "published";
    return {
      attempt: {
        id: attemptId,
        releaseCandidateId: releaseCandidate.id,
        distributionPackageId: distributionPackage.id,
        channelId: channel.id,
        publishTargetId: target.id,
        publishWindowId: undefined,
        status,
        mode,
        scheduledFor: now,
        executedAt: now,
        resultId,
        adapterKey: "sandbox-adapter-v1",
        createdAt: now,
        updatedAt: now
      },
      result: {
        id: resultId,
        publishAttemptId: attemptId,
        placementId: `sandbox_${releaseCandidate.id}`,
        externalId: `sandbox_${releaseCandidate.id}`,
        permalink: `/sandbox/media-corp/${releaseCandidate.id}`,
        slug: releaseCandidate.packageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        publishedAt: now,
        status,
        previewPayload: {
          channel: channel.slug,
          surface: target.surface,
          title: releaseCandidate.packageTitle,
          body: releaseCandidate.body
        }
      }
    };
  }
};

const DISTRIBUTION_ADAPTERS: DistributionAdapter[] = [sandboxDistributionAdapter];

function buildPublishTargets(channels: DistributionChannel[], audienceSegments: AudienceSegment[]): PublishTarget[] {
  return channels.map((channel) => ({
    id: `target_${channel.id}`,
    channelId: channel.id,
    surface: channel.slug,
    sandbox: channel.status === "sandbox_only",
    audienceSegmentIds: audienceSegments.map((segment) => segment.id),
    requiredFields: channel.requiredPackageFields
  }));
}

function buildPublishWindows(channels: DistributionChannel[]): PublishWindow[] {
  return channels.map((channel, index) => ({
    id: `window_${channel.id}`,
    channelId: channel.id,
    label: `${channel.name} Prime`,
    startAt: new Date(Date.UTC(2026, 2, 7, 16 + index, 0, 0)).toISOString(),
    endAt: new Date(Date.UTC(2026, 2, 7, 18 + index, 0, 0)).toISOString(),
    timezone: "UTC",
    priority: 100 - index * 10
  }));
}

function selectChannel(releaseCandidate: ReleaseCandidate, channels: DistributionChannel[]) {
  return channels.find((channel) => channel.slug === releaseCandidate.channel || channel.id === releaseCandidate.channel) ?? channels.find((channel) => channel.type === "sandbox_demo") ?? channels[0];
}

function selectAdapter(channel: DistributionChannel) {
  return DISTRIBUTION_ADAPTERS.find((adapter) => adapter.supports(channel)) ?? sandboxDistributionAdapter;
}

function buildPerformanceArtifacts(params: {
  releaseCandidate: ReleaseCandidate;
  publishAttempt: PublishAttempt;
  artifactBundleId: string;
  promptTemplateId?: string;
  promptRunId?: string;
  agentId?: AgentPerformanceRollup["agentId"];
  campaignId?: string;
  experimentId?: string;
  audienceSegmentId?: string;
  index: number;
  now: string;
}) {
  const metrics = buildPerformanceSnapshotMetrics(params.index + 1);
  const snapshot: PerformanceSnapshot = {
    id: `snapshot_${params.publishAttempt.id}`,
    publishAttemptId: params.publishAttempt.id,
    releaseCandidateId: params.releaseCandidate.id,
    franchiseId: params.releaseCandidate.franchiseId,
    channelId: params.publishAttempt.channelId,
    metrics,
    createdAt: params.now
  };
  const events: PerformanceEvent[] = [
    {
      id: `event_${params.publishAttempt.id}_impression`,
      publishAttemptId: params.publishAttempt.id,
      releaseCandidateId: params.releaseCandidate.id,
      franchiseId: params.releaseCandidate.franchiseId,
      channelId: params.publishAttempt.channelId,
      artifactBundleId: params.artifactBundleId,
      promptTemplateId: params.promptTemplateId,
      promptRunId: params.promptRunId,
      agentId: params.agentId,
      campaignId: params.campaignId,
      experimentId: params.experimentId,
      audienceSegmentId: params.audienceSegmentId,
      type: "impression",
      value: metrics.impressions,
      occurredAt: params.now
    },
    {
      id: `event_${params.publishAttempt.id}_view`,
      publishAttemptId: params.publishAttempt.id,
      releaseCandidateId: params.releaseCandidate.id,
      franchiseId: params.releaseCandidate.franchiseId,
      channelId: params.publishAttempt.channelId,
      artifactBundleId: params.artifactBundleId,
      promptTemplateId: params.promptTemplateId,
      promptRunId: params.promptRunId,
      agentId: params.agentId,
      campaignId: params.campaignId,
      experimentId: params.experimentId,
      audienceSegmentId: params.audienceSegmentId,
      type: "view",
      value: metrics.views,
      occurredAt: params.now
    },
    {
      id: `event_${params.publishAttempt.id}_click`,
      publishAttemptId: params.publishAttempt.id,
      releaseCandidateId: params.releaseCandidate.id,
      franchiseId: params.releaseCandidate.franchiseId,
      channelId: params.publishAttempt.channelId,
      artifactBundleId: params.artifactBundleId,
      promptTemplateId: params.promptTemplateId,
      promptRunId: params.promptRunId,
      agentId: params.agentId,
      campaignId: params.campaignId,
      experimentId: params.experimentId,
      audienceSegmentId: params.audienceSegmentId,
      type: "click",
      value: metrics.clicks,
      occurredAt: params.now
    },
    {
      id: `event_${params.publishAttempt.id}_share`,
      publishAttemptId: params.publishAttempt.id,
      releaseCandidateId: params.releaseCandidate.id,
      franchiseId: params.releaseCandidate.franchiseId,
      channelId: params.publishAttempt.channelId,
      artifactBundleId: params.artifactBundleId,
      promptTemplateId: params.promptTemplateId,
      promptRunId: params.promptRunId,
      agentId: params.agentId,
      campaignId: params.campaignId,
      experimentId: params.experimentId,
      audienceSegmentId: params.audienceSegmentId,
      type: "share",
      value: metrics.shares,
      occurredAt: params.now
    }
  ];
  return { snapshot, events };
}

export async function runMediaCorpCycle(input?: {
  repository?: CanonRepository;
  memoryStore?: MemoryStore;
  trendBriefs?: TrendBrief[];
  now?: string;
}): Promise<MediaCorpCycleResult> {
  const repository = input?.repository ?? new InMemoryCanonRepository();
  const memoryStore = input?.memoryStore ?? new InMemoryMemoryStore();
  const now = input?.now ?? new Date().toISOString();
  const trendBriefs = (input?.trendBriefs ?? SAMPLE_TREND_BRIEFS).map((brief, index) => runTrendScout(index, brief));

  const seeds: FranchiseSeed[] = [];
  const canonRecords: CanonRecord[] = [];
  const contentPlans: MediaCorpWorldState["contentPlans"] = [];
  const distributionChannels = [...DEFAULT_DISTRIBUTION_CHANNELS];
  const audienceSegments = [...DEFAULT_AUDIENCE_SEGMENTS];
  const publishTargets = buildPublishTargets(distributionChannels, audienceSegments);
  const publishWindows = buildPublishWindows(distributionChannels);
  const publishAttempts: PublishAttempt[] = [];
  const publishResults: PublishResult[] = [];
  const campaigns: Campaign[] = [];
  const campaignItems: CampaignItem[] = [];
  const experimentAssignments: ExperimentAssignment[] = [];
  const performanceEvents: PerformanceEvent[] = [];
  const performanceSnapshots: PerformanceSnapshot[] = [];
  const contentMetricsRollups: ContentMetricsRollup[] = [];
  const channelMetricsRollups: ChannelMetricsRollup[] = [];
  const franchiseMetricsRollups: FranchiseMetricsRollup[] = [];
  const promptPerformanceRollups: PromptPerformanceRollup[] = [];
  const agentPerformanceRollups: AgentPerformanceRollup[] = [];
  const strategyRecommendations: StrategyRecommendation[] = [];
  const promptTemplates = [...PROMPT_TEMPLATE_REGISTRY];
  const promptRuns: PromptRun[] = [];
  const generationJobs: GenerationJob[] = [];
  const artifacts: Artifact[] = [];
  const artifactVersions: ArtifactVersion[] = [];
  const artifactBundles: ArtifactBundle[] = [];
  const artifactReviewScorecards: ArtifactReviewScorecard[] = [];
  const reviewDecisions: ReviewDecision[] = [];
  const releaseCandidates: ReleaseCandidate[] = [];
  const distributionPackages: DistributionPackage[] = [];
  const scorecards: MediaCorpWorldState["scorecards"] = [];
  const publishPlans: MediaCorpWorldState["publishPlans"] = [];
  const performanceReports: PerformanceReport[] = [];
  const franchises: Franchise[] = [];
  const agentTasks: AgentTask[] = [];
  const agentRuns: AgentRun[] = [];

  for (const [index, trendBrief] of trendBriefs.entries()) {
    const seed = runUniverseArchitect({ trendBrief, now }, index);
    seeds.push(seed);
    const canon = runCanonArchivist(seed, runCharacterFoundry(seed));
    canonRecords.push(canon);
    const plans = runContentStudio(seed, canon);
    contentPlans.push(...plans);

    const productionResults = runProductionBundles(seed, canon, plans, now);
    productionResults.forEach((result) => {
      artifactBundles.push(result.bundle);
      artifacts.push(...result.artifacts);
      artifactVersions.push(...result.versions);
      generationJobs.push(...result.jobs);
      promptRuns.push(...result.promptRuns);
    });

    const scorecard = buildQualityScorecard({ seed, canon, contentPlans: plans });
    scorecards.push(scorecard);

    const bundleScorecards = productionResults.map((result) =>
      buildArtifactReviewScorecard({
        seed,
        canon,
        bundle: result.bundle,
        artifacts: result.artifacts
      })
    );
    artifactReviewScorecards.push(...bundleScorecards);

    const decisions = productionResults.map((result, resultIndex) =>
      createReviewDecision({
        bundle: {
          ...result.bundle,
          qualityScore: bundleScorecards[resultIndex].overall,
          riskFlags: bundleScorecards[resultIndex].flags
        },
        franchiseId: seed.id,
        reviewer: "media-corp-admin",
        scorecardId: bundleScorecards[resultIndex].id,
        notes: bundleScorecards[resultIndex].rationale.join(" "),
        createdAt: now
      })
    );
    reviewDecisions.push(...decisions);

    decisions.forEach((decision, resultIndex) => {
      const bundleIndex = artifactBundles.findIndex((bundle) => bundle.id === productionResults[resultIndex].bundle.id);
      if (bundleIndex >= 0) {
        artifactBundles[bundleIndex] = {
          ...artifactBundles[bundleIndex],
          reviewDecisionId: decision.id,
          reviewStatus: decision.decision === "approve" ? "approved" : decision.decision === "reject" ? "rejected" : "revise",
          qualityScore: bundleScorecards[resultIndex].overall,
          riskFlags: bundleScorecards[resultIndex].flags,
          status: decision.decision === "approve" ? "approved" : decision.decision === "reject" ? "rejected" : "in_review",
          updatedAt: now
        };
      }
    });

    const seedReleaseCandidates = decisions
      .map((decision, resultIndex) => ({ decision, result: productionResults[resultIndex], scorecard: bundleScorecards[resultIndex] }))
      .filter(({ decision }) => decision.decision === "approve")
      .map(({ result, scorecard }) => {
        const bundle = artifactBundles.find((item) => item.id === result.bundle.id)!;
        const created = createReleaseCandidate({
          seed,
          bundle,
          artifacts: result.artifacts,
          plan: plans.find((plan) => plan.id === result.bundle.contentPlanId)!,
          createdAt: now
        });
        return {
          releaseCandidate: {
            ...created.releaseCandidate,
            status: recommendReleaseCandidateStatus(scorecard, "approve")
          },
          distributionPackage: created.distributionPackage
        };
      });

    releaseCandidates.push(...seedReleaseCandidates.map((item) => item.releaseCandidate));
    distributionPackages.push(...seedReleaseCandidates.map((item) => item.distributionPackage));

    const campaignId = createId("campaign", seed.slug);
    const campaign: Campaign = {
      id: campaignId,
      type: "franchise_launch",
      franchiseId: seed.id,
      title: `${seed.name} Launch Wave`,
      objective: "Validate traction across safe internal channels.",
      targetAudienceSegmentIds: audienceSegments.map((segment) => segment.id),
      targetChannelIds: distributionChannels.map((channel) => channel.id),
      budgetPriority: 80 - index * 5,
      scheduleStart: now,
      scheduleEnd: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      contentMix: ["wall_post", "shorts", "feature_card"],
      successCriteria: ["CTR > 0.08", "Engagement > 0.15", "Momentum > 70"],
      campaignItemIds: [],
      resultSummary: "Pending execution.",
      createdAt: now
    };
    campaigns.push(campaign);

    seedReleaseCandidates.forEach((item, releaseIndex) => {
      const releaseCandidate = item.releaseCandidate;
      const distributionPackage = item.distributionPackage;
      const channel = selectChannel(releaseCandidate, distributionChannels);
      const target = publishTargets.find((entry) => entry.channelId === channel.id) ?? publishTargets[0];
      const adapter = selectAdapter(channel);
      const published = adapter.publish({
        channel,
        target,
        releaseCandidate,
        distributionPackage,
        mode: channel.status === "sandbox_only" ? "sandbox" : "scheduled",
        now
      });
      publishAttempts.push(published.attempt);
      publishResults.push(published.result);

      const experimentId = createId("experiment", `${releaseCandidate.id}_${channel.id}`);
      const assignment: ExperimentAssignment = {
        id: `assignment_${experimentId}`,
        experimentId,
        releaseCandidateId: releaseCandidate.id,
        channelId: channel.id,
        variantKey: releaseIndex % 2 === 0 ? "title_a" : "title_b",
        hypothesis: "Variant title timing will improve engagement.",
        packageOverrides: {
          packageTitle: releaseIndex % 2 === 0 ? releaseCandidate.packageTitle : `${releaseCandidate.packageTitle} Now`
        },
        status: "completed",
        outcomeNotes: "Synthetic experiment completed."
      };
      experimentAssignments.push(assignment);

      const campaignItemId = createId("campaign_item", `${campaignId}_${releaseCandidate.id}`);
      campaign.campaignItemIds.push(campaignItemId);
      campaignItems.push({
        id: campaignItemId,
        campaignId,
        releaseCandidateId: releaseCandidate.id,
        channelId: channel.id,
        publishAttemptId: published.attempt.id,
        objective: "Launch wave visibility",
        status: published.result.status === "published" ? "published" : "failed"
      });

      const promptRun = promptRuns.find((entry) => entry.artifactBundleId === releaseCandidate.artifactBundleId);
      const perf = buildPerformanceArtifacts({
        releaseCandidate,
        publishAttempt: published.attempt,
        artifactBundleId: releaseCandidate.artifactBundleId,
        promptTemplateId: promptRun?.templateId,
        promptRunId: promptRun?.id,
        agentId: "chief_growth_officer_agent",
        campaignId,
        experimentId,
        audienceSegmentId: audienceSegments[releaseIndex % audienceSegments.length]?.id,
        index: index + releaseIndex,
        now
      });
      performanceSnapshots.push(perf.snapshot);
      performanceEvents.push(...perf.events);
      contentMetricsRollups.push(
        buildContentMetricsRollup({
          artifactBundleId: releaseCandidate.artifactBundleId,
          releaseCandidateId: releaseCandidate.id,
          snapshot: perf.snapshot
        })
      );
    });

    publishPlans.push(...runPublishing(plans.filter((plan) => scorecard.decision !== "kill").map((plan) => ({ ...plan, status: "approved" })), seed));

    const performance = buildPerformanceReport(seed.id, undefined, scorecard.overall, now);
    performanceReports.push(performance);
    franchises.push(
      buildFranchise(
        seed,
        canon,
        calculateFranchiseMomentum({
          bundleScorecards,
          releaseCandidates: seedReleaseCandidates.map((item) => item.releaseCandidate),
          previousTier: scorecard.decision
        }),
        [performance]
      )
    );

    await memoryStore.write({
      id: createId("memory", seed.slug),
      franchiseId: seed.id,
      agentId: "franchise_manager_agent",
      kind: "cycle_summary",
      key: `franchise:${seed.slug}:latest`,
      payload: { scorecard, approvedReleaseCount: seedReleaseCandidates.length },
      createdAt: now
    });
  }

  for (const channel of distributionChannels) {
    const snapshots = performanceSnapshots.filter((snapshot) => snapshot.channelId === channel.id);
    if (snapshots.length > 0) channelMetricsRollups.push(buildChannelMetricsRollup({ channelId: channel.id, snapshots }));
  }
  for (const franchise of franchises) {
    const snapshots = performanceSnapshots.filter((snapshot) => snapshot.franchiseId === franchise.id);
    if (snapshots.length > 0) franchiseMetricsRollups.push(buildFranchiseMetricsRollup({ franchiseId: franchise.id, snapshots }));
  }
  for (const promptRun of promptRuns) {
    const snapshots = performanceSnapshots.filter((snapshot) => {
      const attempt = publishAttempts.find((entry) => entry.id === snapshot.publishAttemptId);
      const release = releaseCandidates.find((entry) => entry.id === attempt?.releaseCandidateId);
      return release?.artifactBundleId === promptRun.artifactBundleId;
    });
    if (snapshots.length > 0) {
      promptPerformanceRollups.push(
        buildPromptPerformanceRollup({
          promptTemplateId: promptRun.templateId,
          promptRunId: promptRun.id,
          snapshots
        })
      );
    }
  }
  if (performanceSnapshots.length > 0) {
    agentPerformanceRollups.push(buildAgentPerformanceRollup({ agentId: "chief_growth_officer_agent", snapshots: performanceSnapshots }));
  }
  strategyRecommendations.push(
    ...buildStrategyRecommendations({
      franchiseRollups: franchiseMetricsRollups,
      channelRollups: channelMetricsRollups,
      promptRollups: promptPerformanceRollups
    })
  );

  franchiseMetricsRollups.forEach((rollup) => {
    const franchise = franchises.find((item) => item.id === rollup.franchiseId);
    if (!franchise) return;
    if (rollup.momentumScore >= 84) franchise.tier = "flagship";
    else if (rollup.momentumScore >= 70) franchise.tier = "scale";
    else if (rollup.momentumScore >= 56) franchise.tier = "incubate";
    franchise.status = franchise.tier;
  });

  for (const stage of CORE_MEDIA_CORP_WORKFLOW) {
    for (const agentId of stage.requiredAgents) {
      if (agentTasks.some((task) => task.stageId === stage.id && task.agentId === agentId)) continue;
      const task = buildTask(agentId, stage.id, { stage: stage.name }, now);
      agentTasks.push(task);
      agentRuns.push(buildRun(task, `Completed ${stage.name}.`, { stageId: stage.id }, now));
    }
  }

  const worldState: MediaCorpWorldState = {
    generatedAt: now,
    trendBriefs,
    seeds,
    franchises,
    canonRecords,
    contentPlans,
    distributionChannels,
    publishTargets,
    publishWindows,
    publishAttempts,
    publishResults,
    audienceSegments,
    campaigns,
    campaignItems,
    experimentAssignments,
    performanceEvents,
    performanceSnapshots,
    contentMetricsRollups,
    channelMetricsRollups,
    franchiseMetricsRollups,
    promptPerformanceRollups,
    agentPerformanceRollups,
    strategyRecommendations,
    promptTemplates,
    promptRuns,
    generationJobs,
    artifacts,
    artifactVersions,
    artifactBundles,
    artifactReviewScorecards,
    reviewDecisions,
    releaseCandidates,
    distributionPackages,
    scorecards,
    publishPlans,
    performanceReports,
    agentTasks,
    agentRuns,
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
    portfolioSummary: summarizePortfolio(franchises)
  };

  await repository.saveCycle(worldState);

  return {
    worldState,
    summary: {
      trendBriefsCreated: trendBriefs.length,
      seedsCreated: seeds.length,
      franchisesUpdated: franchises.length,
      contentPlansCreated: contentPlans.length,
      publishPlansCreated: publishPlans.length,
      artifactBundlesCreated: artifactBundles.length,
      releaseCandidatesCreated: releaseCandidates.length,
      publishAttemptsCreated: publishAttempts.length,
      recommendationsCreated: strategyRecommendations.length
    }
  };
}
