import { describe, expect, it } from "vitest";
import {
  applyRankingPolicy,
  assignExperiment,
  buildMinimalKnowledgeGraph,
  clearOnlineFeatures,
  enrichContentText,
  getOnlineFeatures,
  getPersonalizationState,
  scoreCandidatesForEntity,
  setPersonalizationState,
  upsertOnlineFeatures
} from "@/lib/intelligence";

describe("intelligence fabric baseline", () => {
  it("builds minimal graph projection", () => {
    const graph = buildMinimalKnowledgeGraph({ userId: "u1", profileId: "p1", module: "Watch", contentId: "c1" });
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.some((edge) => edge.relation === "owns")).toBe(true);
  });

  it("stores and uses online features for candidate scoring", () => {
    clearOnlineFeatures();
    upsertOnlineFeatures("viewer:u1", { affinity_boost: 0.2, freshness_boost: 0.1 });
    const scored = scoreCandidatesForEntity("viewer:u1", [{ id: "x", kind: "feed_post", baseScore: 1 }]);
    expect(scored[0].score).toBeCloseTo(1.3, 4);
    expect(getOnlineFeatures("viewer:u1").affinity_boost).toBe(0.2);
  });

  it("applies ranking policy and deterministic experiment assignment", () => {
    const score = applyRankingPolicy(
      { name: "p", weights: { recency: 1, engagement: 2, editorial: 1, trustPenalty: 1 } },
      { recency: 1, engagement: 2, editorial: 1, trustPenalty: 1 }
    );
    expect(score).toBe(5);

    const a = assignExperiment("exp-1", "subject-1");
    const b = assignExperiment("exp-1", "subject-1");
    expect(a.variant).toBe(b.variant);
  });

  it("handles personalization cache and enrichment", () => {
    setPersonalizationState("viewer:u1", { updatedAt: Date.now(), preferences: { games: 0.7 } });
    expect(getPersonalizationState("viewer:u1")?.preferences.games).toBe(0.7);

    const enrichment = enrichContentText("Watch this game episode now");
    expect(enrichment.topics).toContain("gaming");
    expect(enrichment.topics).toContain("streaming");
  });
});
