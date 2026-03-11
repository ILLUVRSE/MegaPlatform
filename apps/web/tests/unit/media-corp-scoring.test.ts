import { buildQualityScorecard, classifyGreenlight } from "@illuvrse/media-corp-scoring";
import { SAMPLE_TREND_BRIEFS } from "@illuvrse/media-corp-core";
import { runUniverseArchitect, runCharacterFoundry, runCanonArchivist, runContentStudio } from "@illuvrse/media-corp-agents";

describe("media corp scoring", () => {
  it("classifies high risk concepts as kill", () => {
    expect(classifyGreenlight(92, 81)).toBe("kill");
  });

  it("scores a canon-aware bundle into an actionable decision", () => {
    const seed = runUniverseArchitect({ trendBrief: SAMPLE_TREND_BRIEFS[0], now: "2026-03-07T12:00:00.000Z" }, 0);
    const characters = runCharacterFoundry(seed);
    const canon = runCanonArchivist(seed, characters);
    const plans = runContentStudio(seed, canon);
    const scorecard = buildQualityScorecard({ seed, canon, contentPlans: plans });

    expect(scorecard.overall).toBeGreaterThan(50);
    expect(scorecard.contentPlanIds).toHaveLength(plans.length);
    expect(["test", "incubate", "scale", "flagship", "kill"]).toContain(scorecard.decision);
  });
});
