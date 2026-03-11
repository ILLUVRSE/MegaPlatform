import { DEFAULT_AUDIENCE_SEGMENTS, DEFAULT_DISTRIBUTION_CHANNELS, SAMPLE_TREND_BRIEFS } from "@illuvrse/media-corp-core";
import { runCanonArchivist, runCharacterFoundry, runContentStudio, runProductionBundles, runUniverseArchitect, createReleaseCandidate } from "@illuvrse/media-corp-agents";
import { buildArtifactReviewScorecard, buildChannelMetricsRollup, buildPerformanceSnapshotMetrics, buildStrategyRecommendations } from "@illuvrse/media-corp-scoring";
import { runMediaCorpCycle, sandboxDistributionAdapter } from "@illuvrse/media-corp-orchestrator";

describe("media corp distribution v3", () => {
  it("publishes through the sandbox adapter with tracked attempt and result", () => {
    const seed = runUniverseArchitect({ trendBrief: SAMPLE_TREND_BRIEFS[0], now: "2026-03-07T12:00:00.000Z" }, 0);
    const canon = runCanonArchivist(seed, runCharacterFoundry(seed));
    const plan = runContentStudio(seed, canon)[0];
    const bundleResult = runProductionBundles(seed, canon, [plan], "2026-03-07T12:00:00.000Z")[0];
    const scorecard = buildArtifactReviewScorecard({ seed, canon, bundle: bundleResult.bundle, artifacts: bundleResult.artifacts });
    const created = createReleaseCandidate({
      seed,
      bundle: { ...bundleResult.bundle, qualityScore: scorecard.overall },
      artifacts: bundleResult.artifacts,
      plan,
      createdAt: "2026-03-07T12:00:00.000Z"
    });
    const channel = DEFAULT_DISTRIBUTION_CHANNELS.find((item) => item.type === "sandbox_demo")!;
    const target = {
      id: `target_${channel.id}`,
      channelId: channel.id,
      surface: channel.slug,
      sandbox: true,
      audienceSegmentIds: DEFAULT_AUDIENCE_SEGMENTS.map((segment) => segment.id),
      requiredFields: channel.requiredPackageFields
    };

    const published = sandboxDistributionAdapter.publish({
      channel,
      target,
      releaseCandidate: created.releaseCandidate,
      distributionPackage: created.distributionPackage,
      mode: "sandbox",
      now: "2026-03-07T12:00:00.000Z"
    });

    expect(published.attempt.status).toBe("published");
    expect(published.result.permalink).toContain("/sandbox/media-corp/");
  });

  it("builds channel rollups and strategy recommendations from snapshots", () => {
    const channelRollup = buildChannelMetricsRollup({
      channelId: "channel_sandbox",
      snapshots: [
        {
          id: "snap_1",
          publishAttemptId: "attempt_1",
          releaseCandidateId: "release_1",
          franchiseId: "franchise_1",
          channelId: "channel_sandbox",
          metrics: buildPerformanceSnapshotMetrics(2),
          createdAt: "2026-03-07T12:00:00.000Z"
        }
      ]
    });

    const recommendations = buildStrategyRecommendations({
      franchiseRollups: [
        {
          id: "franchise_rollup_1",
          franchiseId: "franchise_1",
          metrics: buildPerformanceSnapshotMetrics(3),
          momentumScore: 88,
          createdAt: "2026-03-07T12:00:00.000Z"
        }
      ],
      channelRollups: [channelRollup],
      promptRollups: [
        {
          id: "prompt_rollup_1",
          promptTemplateId: "shorts_package_builder",
          promptRunId: "run_1",
          metrics: buildPerformanceSnapshotMetrics(4),
          winRate: 82,
          createdAt: "2026-03-07T12:00:00.000Z"
        }
      ]
    });

    expect(channelRollup.efficiencyScore).toBeGreaterThan(0);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it("produces publish attempts, campaigns, snapshots, and recommendations in the full cycle", async () => {
    const result = await runMediaCorpCycle({ now: "2026-03-07T12:00:00.000Z" });

    expect(result.worldState.distributionChannels.length).toBeGreaterThan(0);
    expect(result.worldState.publishAttempts.length).toBeGreaterThan(0);
    expect(result.worldState.campaigns.length).toBeGreaterThan(0);
    expect(result.worldState.performanceSnapshots.length).toBeGreaterThan(0);
    expect(result.worldState.strategyRecommendations.length).toBeGreaterThan(0);
    expect(result.summary.publishAttemptsCreated).toBe(result.worldState.publishAttempts.length);
  });
});
