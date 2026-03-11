import { buildMinimalKnowledgeGraph } from "@/lib/intelligence/knowledgeGraph";
import { enrichContentText } from "@/lib/intelligence/contentUnderstanding";
import { getPlatformRecommendations } from "@/lib/platformRecommendations";

export function getIntelligenceGatewayHealth() {
  const graph = buildMinimalKnowledgeGraph({ userId: "demo-user", module: "Watch" });
  const enrichment = enrichContentText("Watch this game episode now");
  return {
    ok: true,
    version: "v1",
    graphNodes: graph.nodes.length,
    enrichmentTopics: enrichment.topics
  };
}

export async function getUnifiedRecommendationDiagnostics() {
  const recommendations = await getPlatformRecommendations({
    identity: {
      userId: "demo-user",
      anonId: null,
      profileId: null
    },
    session: {
      currentModule: "home",
      trail: []
    }
  });

  return {
    ok: true,
    surfaces: ["home", "watch", "party", "games"],
    recommendationCounts: {
      continueWatching: recommendations.continueWatching.length,
      forYourSquad: recommendations.forYourSquad.length,
      creatorNext: recommendations.creatorNext.length
    },
    diagnostics: recommendations.diagnostics
  };
}
