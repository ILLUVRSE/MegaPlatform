import { SAMPLE_TREND_BRIEFS } from "@illuvrse/media-corp-core";
import {
  createReleaseCandidate,
  createReviewDecision,
  runCanonArchivist,
  runCharacterFoundry,
  runContentStudio,
  runProductionBundles,
  runUniverseArchitect
} from "@illuvrse/media-corp-agents";
import {
  advanceReleaseCandidate,
  applyReviewDecisionToBundle,
  runMediaCorpCycle,
  transitionGenerationJob
} from "@illuvrse/media-corp-orchestrator";
import {
  buildArtifactReviewScorecard,
  calculateFranchiseMomentum,
  recommendReleaseCandidateStatus
} from "@illuvrse/media-corp-scoring";

describe("media corp production v2", () => {
  it("builds artifact review scorecards for production bundles", () => {
    const seed = runUniverseArchitect({ trendBrief: SAMPLE_TREND_BRIEFS[0], now: "2026-03-07T12:00:00.000Z" }, 0);
    const canon = runCanonArchivist(seed, runCharacterFoundry(seed));
    const plans = runContentStudio(seed, canon);
    const result = runProductionBundles(seed, canon, plans.slice(0, 1), "2026-03-07T12:00:00.000Z")[0];
    const scorecard = buildArtifactReviewScorecard({
      seed,
      canon,
      bundle: result.bundle,
      artifacts: result.artifacts
    });

    expect(scorecard.overall).toBeGreaterThan(50);
    expect(scorecard.publishReadiness).toBeGreaterThan(50);
  });

  it("supports generation job state transitions", () => {
    const seed = runUniverseArchitect({ trendBrief: SAMPLE_TREND_BRIEFS[1], now: "2026-03-07T12:00:00.000Z" }, 1);
    const canon = runCanonArchivist(seed, runCharacterFoundry(seed));
    const plans = runContentStudio(seed, canon);
    const job = runProductionBundles(seed, canon, plans.slice(0, 1), "2026-03-07T12:00:00.000Z")[0].jobs[0];

    const running = transitionGenerationJob(job, "running", { workerId: "studio-worker-1" });
    const completed = transitionGenerationJob(running, "completed", { outputsVerified: true });

    expect(running.status).toBe("running");
    expect(completed.status).toBe("completed");
    expect(completed.runtimeMetadata.outputsVerified).toBe(true);
  });

  it("applies review decisions and promotes release candidates", () => {
    const seed = runUniverseArchitect({ trendBrief: SAMPLE_TREND_BRIEFS[2], now: "2026-03-07T12:00:00.000Z" }, 2);
    const canon = runCanonArchivist(seed, runCharacterFoundry(seed));
    const plan = runContentStudio(seed, canon)[0];
    const result = runProductionBundles(seed, canon, [plan], "2026-03-07T12:00:00.000Z")[0];
    const scorecard = buildArtifactReviewScorecard({ seed, canon, bundle: result.bundle, artifacts: result.artifacts });
    const review = createReviewDecision({
      bundle: { ...result.bundle, qualityScore: scorecard.overall },
      franchiseId: seed.id,
      reviewer: "reviewer",
      scorecardId: scorecard.id,
      notes: "Looks shippable.",
      createdAt: "2026-03-07T12:00:00.000Z"
    });
    const reviewed = applyReviewDecisionToBundle(result.bundle, result.artifacts, "approve");
    const release = createReleaseCandidate({
      seed,
      bundle: reviewed.bundle,
      artifacts: reviewed.artifacts,
      plan,
      createdAt: "2026-03-07T12:00:00.000Z"
    });
    const status = recommendReleaseCandidateStatus(scorecard, "approve");
    const advanced = advanceReleaseCandidate({ ...release.releaseCandidate, status }, "scheduled");

    expect(review.decision).toBe("approve");
    expect(reviewed.bundle.reviewStatus).toBe("approved");
    expect(release.releaseCandidate.assetIds.length).toBeGreaterThan(0);
    expect(advanced.status).toBe("scheduled");
  });

  it("feeds approved bundles back into portfolio momentum", async () => {
    const result = await runMediaCorpCycle({ now: "2026-03-07T12:00:00.000Z" });
    const franchise = result.worldState.franchises[0];
    const bundleScorecards = result.worldState.artifactReviewScorecards.filter((item) => item.franchiseId === franchise.id);
    const releases = result.worldState.releaseCandidates.filter((item) => item.franchiseId === franchise.id);
    const momentumTier = calculateFranchiseMomentum({
      bundleScorecards,
      releaseCandidates: releases,
      previousTier: franchise.tier
    });

    expect(bundleScorecards.length).toBeGreaterThan(0);
    expect(releases.length).toBeGreaterThan(0);
    expect(["incubate", "scale", "flagship", "test", "kill"]).toContain(momentumTier);
  });
});
