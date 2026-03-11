import { prisma, type PrismaClient } from "@illuvrse/db";
import type { CanonRecord, Franchise, FranchiseSeed, MediaCorpWorldState } from "@illuvrse/media-corp-core";

export interface CanonRepository {
  listWorldState(): Promise<Partial<MediaCorpWorldState>>;
  saveCycle(worldState: MediaCorpWorldState): Promise<void>;
}

export class InMemoryCanonRepository implements CanonRepository {
  private state: Partial<MediaCorpWorldState> = {};

  async listWorldState() {
    return this.state;
  }

  async saveCycle(worldState: MediaCorpWorldState) {
    this.state = worldState;
  }
}

type DbClient = PrismaClient | typeof prisma;

function toPortfolioTier(value: string) {
  return value.toUpperCase() as
    | "KILL"
    | "TEST"
    | "INCUBATE"
    | "SCALE"
    | "FLAGSHIP";
}

function toDivision(value: string) {
  return value.toUpperCase() as
    | "BOARD"
    | "RESEARCH"
    | "IP_FOUNDRY"
    | "CONTENT_STUDIO"
    | "QUALITY"
    | "PUBLISHING"
    | "FRANCHISE_DEVELOPMENT";
}

function toFormat(value: string) {
  return value.toUpperCase() as
    | "IMAGE"
    | "ARTWORK"
    | "MEME"
    | "WALL_POST"
    | "VIDEO_SHORT"
    | "MUSIC_CONCEPT"
    | "PODCAST_CONCEPT"
    | "GAME_CONCEPT"
    | "MOVIE_CONCEPT";
}

function toRunStatus(value: string) {
  if (value === "pending") return "QUEUED";
  if (value === "completed") return "SUCCEEDED";
  return value.toUpperCase() as "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "BLOCKED";
}

function toArtifactType(value: string) {
  return value.toUpperCase() as
    | "IMAGE_CONCEPT"
    | "GENERATED_IMAGE"
    | "MEME_VARIANT"
    | "WALL_POST_COPY"
    | "SHORTS_PACKAGE"
    | "PODCAST_PACKAGE"
    | "MUSIC_CONCEPT_PACK"
    | "GAME_CONCEPT_PACK"
    | "TRAILER_PACKAGE"
    | "DISTRIBUTION_PACKAGE";
}

function toArtifactStatus(value: string) {
  return value.toUpperCase() as "DRAFT" | "GENERATED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "RELEASE_CANDIDATE" | "PUBLISHED";
}

function toGenerationJobType(value: string) {
  return value.replace(/-/g, "_").toUpperCase() as
    | "GENERATE_IMAGE"
    | "GENERATE_MEME_SET"
    | "GENERATE_WALL_POST"
    | "GENERATE_SHORTS_PACKAGE"
    | "GENERATE_PODCAST_PACKAGE"
    | "GENERATE_MUSIC_CONCEPT"
    | "GENERATE_GAME_CONCEPT_PACK"
    | "GENERATE_TRAILER_PACKAGE";
}

function toGenerationJobStatus(value: string) {
  return value.toUpperCase() as "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "RETRYABLE_FAILURE";
}

function toReviewDecision(value: string) {
  return value.toUpperCase() as "APPROVE" | "REJECT" | "REVISE";
}

function toReleaseCandidateStatus(value: string) {
  return value.toUpperCase() as "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED";
}

function toChannelType(value: string) {
  return value.toUpperCase() as
    | "WALL_POSTS"
    | "SHORTS_FEED"
    | "FEATURED_CARDS"
    | "HOME_FEED_MODULE"
    | "NEWSLETTER_DIGEST"
    | "PODCAST_FEED"
    | "FRANCHISE_LANDING_PAGE"
    | "GAME_DISCOVERY_SHELF"
    | "SANDBOX_DEMO";
}

function toPublishAttemptStatus(value: string) {
  return value.toUpperCase() as
    | "QUEUED"
    | "SCHEDULED"
    | "IMMEDIATE"
    | "DRY_RUN"
    | "SANDBOX"
    | "FAILED"
    | "CANCELLED"
    | "PUBLISHED"
    | "PARTIALLY_PUBLISHED";
}

function toCampaignType(value: string) {
  return value.toUpperCase() as
    | "FRANCHISE_LAUNCH"
    | "SEASONAL_DROP"
    | "CHARACTER_INTRODUCTION"
    | "MEME_BURST"
    | "SHORTS_BURST"
    | "PODCAST_PROMO_RUN"
    | "TRAILER_PUSH"
    | "GAME_CONCEPT_TEST_WAVE";
}

function toExperimentStatus(value: string) {
  return value.toUpperCase() as "DRAFT" | "RUNNING" | "COMPLETED";
}

function toRecommendationType(value: string) {
  return value.toUpperCase() as
    | "INCREASE_FRANCHISE_MOMENTUM"
    | "DECREASE_FRANCHISE_MOMENTUM"
    | "PROMOTE_TIER"
    | "SUPPRESS_FORMAT"
    | "PRIORITIZE_CHANNEL"
    | "RECOMMEND_SEQUEL"
    | "RECOMMEND_SPINOFF"
    | "RECOMMEND_CAMPAIGN"
    | "RECOMMEND_REWORK";
}

export class PrismaCanonRepository implements CanonRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async listWorldState(): Promise<Partial<MediaCorpWorldState>> {
    const db = this.db as any;
    const [trendBriefs, seeds, franchises, canonRecords, contentPlans, distributionChannels, publishTargets, publishWindows, publishAttempts, publishResults, audienceSegments, campaigns, campaignItems, experimentAssignments, performanceEvents, performanceSnapshots, contentMetricsRollups, channelMetricsRollups, franchiseMetricsRollups, promptPerformanceRollups, agentPerformanceRollups, strategyRecommendations, promptTemplates, promptRuns, generationJobs, artifactBundles, artifacts, artifactVersions, artifactReviewScorecards, reviewDecisions, releaseCandidates, distributionPackages, scorecards, publishPlans, performanceReports, tasks, runs, latestSnapshot] =
      await Promise.all([
        db.mediaTrendBrief.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
        db.mediaFranchiseSeed.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
        db.mediaFranchise.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }),
        db.mediaCanonRecord.findMany({ orderBy: [{ franchiseExternalId: "asc" }, { version: "desc" }] }),
        db.mediaContentPlan.findMany({ orderBy: { updatedAt: "desc" }, take: 80 }),
        db.mediaDistributionChannel.findMany({ orderBy: { updatedAt: "desc" }, take: 40 }),
        db.mediaPublishTarget.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
        db.mediaPublishWindow.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
        db.mediaPublishAttempt.findMany({ orderBy: { updatedAt: "desc" }, take: 160 }),
        db.mediaPublishResult.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaAudienceSegment.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
        db.mediaCampaign.findMany({ orderBy: { updatedAt: "desc" }, take: 80 }),
        db.mediaCampaignItem.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaExperimentAssignment.findMany({ orderBy: { updatedAt: "desc" }, take: 160 }),
        db.mediaPerformanceEvent.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
        db.mediaPerformanceSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaContentMetricsRollup.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaChannelMetricsRollup.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaFranchiseMetricsRollup.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaPromptPerformanceRollup.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaAgentPerformanceRollup.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaStrategyRecommendation.findMany({ orderBy: { createdAt: "desc" }, take: 160 }),
        db.mediaPromptTemplate.findMany({ orderBy: [{ externalId: "asc" }, { version: "desc" }] }),
        db.mediaPromptRun.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
        db.mediaGenerationJob.findMany({ orderBy: { updatedAt: "desc" }, take: 120 }),
        db.mediaArtifactBundle.findMany({ orderBy: { updatedAt: "desc" }, take: 120 }),
        db.mediaArtifact.findMany({ orderBy: { updatedAt: "desc" }, take: 240 }),
        db.mediaArtifactVersion.findMany({ orderBy: { createdAt: "desc" }, take: 240 }),
        db.mediaArtifactReviewScorecard.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
        db.mediaReviewDecision.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
        db.mediaReleaseCandidate.findMany({ orderBy: { updatedAt: "desc" }, take: 120 }),
        db.mediaDistributionPackage.findMany({ orderBy: { createdAt: "desc" }, take: 120 }),
        db.mediaQualityScorecard.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
        db.mediaPublishPlan.findMany({ orderBy: { scheduledFor: "asc" }, take: 80 }),
        db.mediaPerformanceReport.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
        db.mediaAgentTask.findMany({ orderBy: { updatedAt: "desc" }, take: 80 }),
        db.mediaAgentRun.findMany({ orderBy: { startedAt: "desc" }, take: 120 }),
        db.mediaWorldStateSnapshot.findFirst({ orderBy: { generatedAt: "desc" } })
      ]);

    return {
      generatedAt: latestSnapshot?.generatedAt.toISOString() ?? new Date().toISOString(),
      trendBriefs: trendBriefs.map((item) => item.payload as unknown as MediaCorpWorldState["trendBriefs"][number]),
      seeds: seeds.map((item) => item.payload as unknown as FranchiseSeed),
      franchises: franchises.map((item) => item.payload as unknown as Franchise),
      canonRecords: canonRecords.map((item) => item.payload as unknown as CanonRecord),
      contentPlans: contentPlans.map((item) => item.payload as unknown as MediaCorpWorldState["contentPlans"][number]),
      distributionChannels: distributionChannels.map((item) => item.payload as unknown as MediaCorpWorldState["distributionChannels"][number]),
      publishTargets: publishTargets.map((item) => item.payload as unknown as MediaCorpWorldState["publishTargets"][number]),
      publishWindows: publishWindows.map((item) => item.payload as unknown as MediaCorpWorldState["publishWindows"][number]),
      publishAttempts: publishAttempts.map((item) => item.payload as unknown as MediaCorpWorldState["publishAttempts"][number]),
      publishResults: publishResults.map((item) => item.payload as unknown as MediaCorpWorldState["publishResults"][number]),
      audienceSegments: audienceSegments.map((item) => item.payload as unknown as MediaCorpWorldState["audienceSegments"][number]),
      campaigns: campaigns.map((item) => item.payload as unknown as MediaCorpWorldState["campaigns"][number]),
      campaignItems: campaignItems.map((item) => item.payload as unknown as MediaCorpWorldState["campaignItems"][number]),
      experimentAssignments: experimentAssignments.map((item) => item.payload as unknown as MediaCorpWorldState["experimentAssignments"][number]),
      performanceEvents: performanceEvents.map((item) => item.payload as unknown as MediaCorpWorldState["performanceEvents"][number]),
      performanceSnapshots: performanceSnapshots.map((item) => item.payload as unknown as MediaCorpWorldState["performanceSnapshots"][number]),
      contentMetricsRollups: contentMetricsRollups.map((item) => item.payload as unknown as MediaCorpWorldState["contentMetricsRollups"][number]),
      channelMetricsRollups: channelMetricsRollups.map((item) => item.payload as unknown as MediaCorpWorldState["channelMetricsRollups"][number]),
      franchiseMetricsRollups: franchiseMetricsRollups.map((item) => item.payload as unknown as MediaCorpWorldState["franchiseMetricsRollups"][number]),
      promptPerformanceRollups: promptPerformanceRollups.map((item) => item.payload as unknown as MediaCorpWorldState["promptPerformanceRollups"][number]),
      agentPerformanceRollups: agentPerformanceRollups.map((item) => item.payload as unknown as MediaCorpWorldState["agentPerformanceRollups"][number]),
      strategyRecommendations: strategyRecommendations.map((item) => item.payload as unknown as MediaCorpWorldState["strategyRecommendations"][number]),
      promptTemplates: promptTemplates.map((item) => item.payload as unknown as MediaCorpWorldState["promptTemplates"][number]),
      promptRuns: promptRuns.map((item) => item.payload as unknown as MediaCorpWorldState["promptRuns"][number]),
      generationJobs: generationJobs.map((item) => item.payload as unknown as MediaCorpWorldState["generationJobs"][number]),
      artifacts: artifacts.map((item) => item.payload as unknown as MediaCorpWorldState["artifacts"][number]),
      artifactVersions: artifactVersions.map((item) => item.payload as unknown as MediaCorpWorldState["artifactVersions"][number]),
      artifactBundles: artifactBundles.map((item) => item.payload as unknown as MediaCorpWorldState["artifactBundles"][number]),
      artifactReviewScorecards: artifactReviewScorecards.map((item) => item.payload as unknown as MediaCorpWorldState["artifactReviewScorecards"][number]),
      reviewDecisions: reviewDecisions.map((item) => item.payload as unknown as MediaCorpWorldState["reviewDecisions"][number]),
      releaseCandidates: releaseCandidates.map((item) => item.payload as unknown as MediaCorpWorldState["releaseCandidates"][number]),
      distributionPackages: distributionPackages.map((item) => item.payload as unknown as MediaCorpWorldState["distributionPackages"][number]),
      scorecards: scorecards.map((item) => item.payload as unknown as MediaCorpWorldState["scorecards"][number]),
      publishPlans: publishPlans.map((item) => item.payload as unknown as MediaCorpWorldState["publishPlans"][number]),
      performanceReports: performanceReports.map((item) => item.payload as unknown as MediaCorpWorldState["performanceReports"][number]),
      agentTasks: tasks.map((item) => item.payload as unknown as MediaCorpWorldState["agentTasks"][number]),
      agentRuns: runs.map((item) => item.payload as unknown as MediaCorpWorldState["agentRuns"][number]),
      portfolioSummary: (latestSnapshot?.payload as any)?.portfolioSummary
    };
  }

  async saveCycle(worldState: MediaCorpWorldState) {
    const db = this.db as any;
    await db.$transaction(async (tx: any) => {
      for (const brief of worldState.trendBriefs) {
        await tx.mediaTrendBrief.upsert({
          where: { externalId: brief.id },
          update: {
            title: brief.title,
            opportunityScore: brief.opportunityScore,
            payload: brief
          },
          create: {
            externalId: brief.id,
            title: brief.title,
            opportunityScore: brief.opportunityScore,
            payload: brief
          }
        });
      }

      for (const seed of worldState.seeds) {
        await tx.mediaFranchiseSeed.upsert({
          where: { slug: seed.slug },
          update: {
            name: seed.name,
            status: toPortfolioTier(worldState.scorecards.find((card) => card.seedId === seed.id)?.decision ?? "test"),
            trendBriefExternalId: seed.trendBriefId,
            payload: seed
          },
          create: {
            slug: seed.slug,
            name: seed.name,
            status: toPortfolioTier(worldState.scorecards.find((card) => card.seedId === seed.id)?.decision ?? "test"),
            trendBriefExternalId: seed.trendBriefId,
            payload: seed
          }
        });
      }

      for (const franchise of worldState.franchises) {
        await tx.mediaFranchise.upsert({
          where: { slug: franchise.slug },
          update: {
            name: franchise.name,
            tier: toPortfolioTier(franchise.tier),
            status: toPortfolioTier(franchise.status),
            payload: franchise
          },
          create: {
            slug: franchise.slug,
            name: franchise.name,
            tier: toPortfolioTier(franchise.tier),
            status: toPortfolioTier(franchise.status),
            payload: franchise
          }
        });
      }

      for (const canon of worldState.canonRecords) {
        await tx.mediaCanonRecord.create({
          data: {
            franchiseExternalId: canon.franchiseId,
            version: canon.version,
            payload: canon
          }
        });
      }

      for (const plan of worldState.contentPlans) {
        await tx.mediaContentPlan.upsert({
          where: { externalId: plan.id },
          update: {
            franchiseExternalId: plan.franchiseId,
            seedExternalId: plan.seedId,
            format: toFormat(plan.format),
            title: plan.title,
            status: plan.status,
            payload: plan
          },
          create: {
            externalId: plan.id,
            franchiseExternalId: plan.franchiseId,
            seedExternalId: plan.seedId,
            format: toFormat(plan.format),
            title: plan.title,
            status: plan.status,
            payload: plan
          }
        });
      }

      for (const channel of worldState.distributionChannels) {
        await tx.mediaDistributionChannel.upsert({
          where: { externalId: channel.id },
          update: {
            slug: channel.slug,
            name: channel.name,
            type: toChannelType(channel.type),
            status: channel.status,
            payload: channel
          },
          create: {
            externalId: channel.id,
            slug: channel.slug,
            name: channel.name,
            type: toChannelType(channel.type),
            status: channel.status,
            payload: channel
          }
        });
      }

      for (const target of worldState.publishTargets) {
        await tx.mediaPublishTarget.upsert({
          where: { externalId: target.id },
          update: {
            channelExternalId: target.channelId,
            surface: target.surface,
            payload: target
          },
          create: {
            externalId: target.id,
            channelExternalId: target.channelId,
            surface: target.surface,
            payload: target
          }
        });
      }

      for (const window of worldState.publishWindows) {
        await tx.mediaPublishWindow.upsert({
          where: { externalId: window.id },
          update: {
            channelExternalId: window.channelId,
            label: window.label,
            payload: window
          },
          create: {
            externalId: window.id,
            channelExternalId: window.channelId,
            label: window.label,
            payload: window
          }
        });
      }

      for (const result of worldState.publishResults) {
        await tx.mediaPublishResult.upsert({
          where: { externalId: result.id },
          update: {
            publishAttemptExternalId: result.publishAttemptId,
            status: toPublishAttemptStatus(result.status),
            payload: result
          },
          create: {
            externalId: result.id,
            publishAttemptExternalId: result.publishAttemptId,
            status: toPublishAttemptStatus(result.status),
            payload: result
          }
        });
      }

      for (const attempt of worldState.publishAttempts) {
        await tx.mediaPublishAttempt.upsert({
          where: { externalId: attempt.id },
          update: {
            releaseCandidateExternalId: attempt.releaseCandidateId,
            distributionPackageExternalId: attempt.distributionPackageId,
            channelExternalId: attempt.channelId,
            publishTargetExternalId: attempt.publishTargetId,
            publishWindowExternalId: attempt.publishWindowId,
            status: toPublishAttemptStatus(attempt.status),
            mode: attempt.mode,
            adapterKey: attempt.adapterKey,
            payload: attempt
          },
          create: {
            externalId: attempt.id,
            releaseCandidateExternalId: attempt.releaseCandidateId,
            distributionPackageExternalId: attempt.distributionPackageId,
            channelExternalId: attempt.channelId,
            publishTargetExternalId: attempt.publishTargetId,
            publishWindowExternalId: attempt.publishWindowId,
            status: toPublishAttemptStatus(attempt.status),
            mode: attempt.mode,
            adapterKey: attempt.adapterKey,
            payload: attempt
          }
        });
      }

      for (const segment of worldState.audienceSegments) {
        await tx.mediaAudienceSegment.upsert({
          where: { externalId: segment.id },
          update: {
            name: segment.name,
            payload: segment
          },
          create: {
            externalId: segment.id,
            name: segment.name,
            payload: segment
          }
        });
      }

      for (const campaign of worldState.campaigns) {
        await tx.mediaCampaign.upsert({
          where: { externalId: campaign.id },
          update: {
            type: toCampaignType(campaign.type),
            franchiseExternalId: campaign.franchiseId,
            title: campaign.title,
            payload: campaign
          },
          create: {
            externalId: campaign.id,
            type: toCampaignType(campaign.type),
            franchiseExternalId: campaign.franchiseId,
            title: campaign.title,
            payload: campaign
          }
        });
      }

      for (const item of worldState.campaignItems) {
        await tx.mediaCampaignItem.upsert({
          where: { externalId: item.id },
          update: {
            campaignExternalId: item.campaignId,
            releaseCandidateExternalId: item.releaseCandidateId,
            channelExternalId: item.channelId,
            publishAttemptExternalId: item.publishAttemptId,
            payload: item
          },
          create: {
            externalId: item.id,
            campaignExternalId: item.campaignId,
            releaseCandidateExternalId: item.releaseCandidateId,
            channelExternalId: item.channelId,
            publishAttemptExternalId: item.publishAttemptId,
            payload: item
          }
        });
      }

      for (const assignment of worldState.experimentAssignments) {
        await tx.mediaExperimentAssignment.upsert({
          where: { externalId: assignment.id },
          update: {
            experimentId: assignment.experimentId,
            releaseCandidateExternalId: assignment.releaseCandidateId,
            channelExternalId: assignment.channelId,
            status: toExperimentStatus(assignment.status),
            payload: assignment
          },
          create: {
            externalId: assignment.id,
            experimentId: assignment.experimentId,
            releaseCandidateExternalId: assignment.releaseCandidateId,
            channelExternalId: assignment.channelId,
            status: toExperimentStatus(assignment.status),
            payload: assignment
          }
        });
      }

      for (const event of worldState.performanceEvents) {
        await tx.mediaPerformanceEvent.upsert({
          where: { externalId: event.id },
          update: {
            publishAttemptExternalId: event.publishAttemptId,
            releaseCandidateExternalId: event.releaseCandidateId,
            franchiseExternalId: event.franchiseId,
            channelExternalId: event.channelId,
            artifactBundleExternalId: event.artifactBundleId,
            payload: event
          },
          create: {
            externalId: event.id,
            publishAttemptExternalId: event.publishAttemptId,
            releaseCandidateExternalId: event.releaseCandidateId,
            franchiseExternalId: event.franchiseId,
            channelExternalId: event.channelId,
            artifactBundleExternalId: event.artifactBundleId,
            payload: event
          }
        });
      }

      for (const snapshot of worldState.performanceSnapshots) {
        await tx.mediaPerformanceSnapshot.upsert({
          where: { externalId: snapshot.id },
          update: {
            publishAttemptExternalId: snapshot.publishAttemptId,
            releaseCandidateExternalId: snapshot.releaseCandidateId,
            franchiseExternalId: snapshot.franchiseId,
            channelExternalId: snapshot.channelId,
            payload: snapshot
          },
          create: {
            externalId: snapshot.id,
            publishAttemptExternalId: snapshot.publishAttemptId,
            releaseCandidateExternalId: snapshot.releaseCandidateId,
            franchiseExternalId: snapshot.franchiseId,
            channelExternalId: snapshot.channelId,
            payload: snapshot
          }
        });
      }

      for (const rollup of worldState.contentMetricsRollups) {
        await tx.mediaContentMetricsRollup.upsert({
          where: { externalId: rollup.id },
          update: {
            artifactBundleExternalId: rollup.artifactBundleId,
            releaseCandidateExternalId: rollup.releaseCandidateId,
            payload: rollup
          },
          create: {
            externalId: rollup.id,
            artifactBundleExternalId: rollup.artifactBundleId,
            releaseCandidateExternalId: rollup.releaseCandidateId,
            payload: rollup
          }
        });
      }

      for (const rollup of worldState.channelMetricsRollups) {
        await tx.mediaChannelMetricsRollup.upsert({
          where: { externalId: rollup.id },
          update: {
            channelExternalId: rollup.channelId,
            payload: rollup
          },
          create: {
            externalId: rollup.id,
            channelExternalId: rollup.channelId,
            payload: rollup
          }
        });
      }

      for (const rollup of worldState.franchiseMetricsRollups) {
        await tx.mediaFranchiseMetricsRollup.upsert({
          where: { externalId: rollup.id },
          update: {
            franchiseExternalId: rollup.franchiseId,
            payload: rollup
          },
          create: {
            externalId: rollup.id,
            franchiseExternalId: rollup.franchiseId,
            payload: rollup
          }
        });
      }

      for (const rollup of worldState.promptPerformanceRollups) {
        await tx.mediaPromptPerformanceRollup.upsert({
          where: { externalId: rollup.id },
          update: {
            promptTemplateExternalId: rollup.promptTemplateId,
            promptRunExternalId: rollup.promptRunId,
            payload: rollup
          },
          create: {
            externalId: rollup.id,
            promptTemplateExternalId: rollup.promptTemplateId,
            promptRunExternalId: rollup.promptRunId,
            payload: rollup
          }
        });
      }

      for (const rollup of worldState.agentPerformanceRollups) {
        await tx.mediaAgentPerformanceRollup.upsert({
          where: { externalId: rollup.id },
          update: {
            agentId: rollup.agentId,
            payload: rollup
          },
          create: {
            externalId: rollup.id,
            agentId: rollup.agentId,
            payload: rollup
          }
        });
      }

      for (const recommendation of worldState.strategyRecommendations) {
        await tx.mediaStrategyRecommendation.upsert({
          where: { externalId: recommendation.id },
          update: {
            recommendationType: toRecommendationType(recommendation.recommendationType),
            franchiseExternalId: recommendation.franchiseId,
            channelExternalId: recommendation.channelId,
            payload: recommendation
          },
          create: {
            externalId: recommendation.id,
            recommendationType: toRecommendationType(recommendation.recommendationType),
            franchiseExternalId: recommendation.franchiseId,
            channelExternalId: recommendation.channelId,
            payload: recommendation
          }
        });
      }

      for (const template of worldState.promptTemplates) {
        await tx.mediaPromptTemplate.upsert({
          where: {
            externalId_version: {
              externalId: template.id,
              version: template.version
            }
          },
          update: {
            medium: toFormat(template.medium),
            purpose: template.purpose,
            payload: template
          },
          create: {
            externalId: template.id,
            version: template.version,
            medium: toFormat(template.medium),
            purpose: template.purpose,
            payload: template
          }
        });
      }

      for (const promptRun of worldState.promptRuns) {
        await tx.mediaPromptRun.upsert({
          where: { externalId: promptRun.id },
          update: {
            templateExternalId: promptRun.templateId,
            templateVersion: promptRun.templateVersion,
            franchiseExternalId: promptRun.franchiseId,
            artifactBundleExternalId: promptRun.artifactBundleId,
            generationJobExternalId: promptRun.generationJobId,
            payload: promptRun
          },
          create: {
            externalId: promptRun.id,
            templateExternalId: promptRun.templateId,
            templateVersion: promptRun.templateVersion,
            franchiseExternalId: promptRun.franchiseId,
            artifactBundleExternalId: promptRun.artifactBundleId,
            generationJobExternalId: promptRun.generationJobId,
            payload: promptRun
          }
        });
      }

      for (const job of worldState.generationJobs) {
        await tx.mediaGenerationJob.upsert({
          where: { externalId: job.id },
          update: {
            franchiseExternalId: job.franchiseId,
            seedExternalId: job.seedId,
            contentPlanExternalId: job.contentPlanId,
            artifactBundleExternalId: job.artifactBundleId,
            jobType: toGenerationJobType(job.jobType),
            status: toGenerationJobStatus(job.status),
            provider: job.provider,
            model: job.model,
            promptTemplateExternalId: job.promptTemplateId,
            payload: job
          },
          create: {
            externalId: job.id,
            franchiseExternalId: job.franchiseId,
            seedExternalId: job.seedId,
            contentPlanExternalId: job.contentPlanId,
            artifactBundleExternalId: job.artifactBundleId,
            jobType: toGenerationJobType(job.jobType),
            status: toGenerationJobStatus(job.status),
            provider: job.provider,
            model: job.model,
            promptTemplateExternalId: job.promptTemplateId,
            payload: job
          }
        });
      }

      for (const bundle of worldState.artifactBundles) {
        await tx.mediaArtifactBundle.upsert({
          where: { externalId: bundle.id },
          update: {
            franchiseExternalId: bundle.franchiseId,
            seedExternalId: bundle.seedId,
            contentPlanExternalId: bundle.contentPlanId,
            title: bundle.title,
            medium: toFormat(bundle.medium),
            status: toArtifactStatus(bundle.status),
            reviewStatus: bundle.reviewStatus,
            qualityScore: bundle.qualityScore,
            payload: bundle
          },
          create: {
            externalId: bundle.id,
            franchiseExternalId: bundle.franchiseId,
            seedExternalId: bundle.seedId,
            contentPlanExternalId: bundle.contentPlanId,
            title: bundle.title,
            medium: toFormat(bundle.medium),
            status: toArtifactStatus(bundle.status),
            reviewStatus: bundle.reviewStatus,
            qualityScore: bundle.qualityScore,
            payload: bundle
          }
        });
      }

      for (const artifact of worldState.artifacts) {
        await tx.mediaArtifact.upsert({
          where: { externalId: artifact.id },
          update: {
            franchiseExternalId: artifact.franchiseId,
            seedExternalId: artifact.seedId,
            contentPlanExternalId: artifact.contentPlanId,
            artifactBundleExternalId: artifact.artifactBundleId,
            artifactType: toArtifactType(artifact.artifactType),
            title: artifact.title,
            status: toArtifactStatus(artifact.status),
            reviewStatus: artifact.reviewStatus,
            qualityScore: artifact.qualityScore,
            rightsSimilarityRisk: artifact.rightsSimilarityRisk,
            payload: artifact
          },
          create: {
            externalId: artifact.id,
            franchiseExternalId: artifact.franchiseId,
            seedExternalId: artifact.seedId,
            contentPlanExternalId: artifact.contentPlanId,
            artifactBundleExternalId: artifact.artifactBundleId,
            artifactType: toArtifactType(artifact.artifactType),
            title: artifact.title,
            status: toArtifactStatus(artifact.status),
            reviewStatus: artifact.reviewStatus,
            qualityScore: artifact.qualityScore,
            rightsSimilarityRisk: artifact.rightsSimilarityRisk,
            payload: artifact
          }
        });
      }

      for (const version of worldState.artifactVersions) {
        await tx.mediaArtifactVersion.upsert({
          where: { externalId: version.id },
          update: {
            artifactExternalId: version.artifactId,
            version: version.version,
            payload: version
          },
          create: {
            externalId: version.id,
            artifactExternalId: version.artifactId,
            version: version.version,
            payload: version
          }
        });
      }

      for (const scorecard of worldState.artifactReviewScorecards) {
        await tx.mediaArtifactReviewScorecard.upsert({
          where: { externalId: scorecard.id },
          update: {
            franchiseExternalId: scorecard.franchiseId,
            artifactBundleExternalId: scorecard.artifactBundleId,
            overall: scorecard.overall,
            payload: scorecard
          },
          create: {
            externalId: scorecard.id,
            franchiseExternalId: scorecard.franchiseId,
            artifactBundleExternalId: scorecard.artifactBundleId,
            overall: scorecard.overall,
            payload: scorecard
          }
        });
      }

      for (const decision of worldState.reviewDecisions) {
        await tx.mediaReviewDecision.upsert({
          where: { externalId: decision.id },
          update: {
            franchiseExternalId: decision.franchiseId,
            artifactBundleExternalId: decision.artifactBundleId,
            decision: toReviewDecision(decision.decision),
            reviewer: decision.reviewer,
            payload: decision
          },
          create: {
            externalId: decision.id,
            franchiseExternalId: decision.franchiseId,
            artifactBundleExternalId: decision.artifactBundleId,
            decision: toReviewDecision(decision.decision),
            reviewer: decision.reviewer,
            payload: decision
          }
        });
      }

      for (const candidate of worldState.releaseCandidates) {
        await tx.mediaReleaseCandidate.upsert({
          where: { externalId: candidate.id },
          update: {
            franchiseExternalId: candidate.franchiseId,
            artifactBundleExternalId: candidate.artifactBundleId,
            channel: candidate.channel,
            status: toReleaseCandidateStatus(candidate.status),
            payload: candidate
          },
          create: {
            externalId: candidate.id,
            franchiseExternalId: candidate.franchiseId,
            artifactBundleExternalId: candidate.artifactBundleId,
            channel: candidate.channel,
            status: toReleaseCandidateStatus(candidate.status),
            payload: candidate
          }
        });
      }

      for (const pkg of worldState.distributionPackages) {
        await tx.mediaDistributionPackage.upsert({
          where: { externalId: pkg.id },
          update: {
            releaseCandidateExternalId: pkg.releaseCandidateId,
            channel: pkg.channel,
            payload: pkg
          },
          create: {
            externalId: pkg.id,
            releaseCandidateExternalId: pkg.releaseCandidateId,
            channel: pkg.channel,
            payload: pkg
          }
        });
      }

      for (const scorecard of worldState.scorecards) {
        await tx.mediaQualityScorecard.create({
          data: {
            externalId: scorecard.id,
            franchiseExternalId: scorecard.franchiseId,
            seedExternalId: scorecard.seedId,
            decision: toPortfolioTier(scorecard.decision),
            overall: scorecard.overall,
            payload: scorecard
          }
        });
      }

      for (const publishPlan of worldState.publishPlans) {
        await tx.mediaPublishPlan.upsert({
          where: { externalId: publishPlan.id },
          update: {
            franchiseExternalId: publishPlan.franchiseId,
            contentPlanExternalId: publishPlan.contentPlanId,
            status: publishPlan.status,
            scheduledFor: new Date(publishPlan.scheduledFor),
            payload: publishPlan
          },
          create: {
            externalId: publishPlan.id,
            franchiseExternalId: publishPlan.franchiseId,
            contentPlanExternalId: publishPlan.contentPlanId,
            status: publishPlan.status,
            scheduledFor: new Date(publishPlan.scheduledFor),
            payload: publishPlan
          }
        });
      }

      for (const report of worldState.performanceReports) {
        await tx.mediaPerformanceReport.create({
          data: {
            externalId: report.id,
            franchiseExternalId: report.franchiseId,
            contentPlanExternalId: report.contentPlanId,
            payload: report
          }
        });
      }

      for (const task of worldState.agentTasks) {
        await tx.mediaAgentTask.upsert({
          where: { externalId: task.id },
          update: {
            agentId: task.agentId,
            division: toDivision(task.division),
            workflowId: task.workflowId,
            stageId: task.stageId,
            status: toRunStatus(task.status),
            priority: task.priority,
            payload: task
          },
          create: {
            externalId: task.id,
            agentId: task.agentId,
            division: toDivision(task.division),
            workflowId: task.workflowId,
            stageId: task.stageId,
            status: toRunStatus(task.status),
            priority: task.priority,
            payload: task
          }
        });
      }

      for (const run of worldState.agentRuns) {
        await tx.mediaAgentRun.create({
          data: {
            externalId: run.id,
            taskExternalId: run.taskId,
            agentId: run.agentId,
            workflowId: run.workflowId,
            status: toRunStatus(run.status),
            summary: run.summary,
            startedAt: new Date(run.startedAt),
            endedAt: run.endedAt ? new Date(run.endedAt) : null,
            payload: run
          }
        });
      }

      await tx.mediaWorldStateSnapshot.create({
        data: {
          generatedAt: new Date(worldState.generatedAt),
          payload: worldState
        }
      });
    });
  }
}
