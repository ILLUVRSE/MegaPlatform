import { prisma } from "@illuvrse/db";
import type { IdentityContext } from "@/lib/identity";
import type { PlatformSessionState } from "@illuvrse/world-state";
import { scoreCandidatesForEntity, type Candidate } from "@/lib/intelligence/candidateService";
import { getPersonalizationState, setPersonalizationState } from "@/lib/intelligence/personalizationCache";
import { applyRankingPolicy, DEFAULT_RANKING_POLICY } from "@/lib/intelligence/rankingPolicy";

export async function getPlatformRecommendations(input: {
  identity: Pick<IdentityContext, "userId" | "anonId" | "profileId">;
  session: Pick<PlatformSessionState, "currentModule" | "trail">;
}) {
  const cacheKey = input.identity.userId ?? input.identity.anonId ?? "guest";
  const personalization =
    getPersonalizationState(cacheKey) ??
    {
      updatedAt: Date.now(),
      preferences: {
        [input.session.currentModule]: 1.2,
        watch: 1,
        party: 0.9,
        studio: input.identity.userId ? 1.1 : 0.5,
        games: 0.8
      }
    };
  setPersonalizationState(cacheKey, personalization);

  const [shows, shorts, templates] = await Promise.all([
    prisma.show.findMany({ orderBy: [{ featured: "desc" }, { updatedAt: "desc" }], take: 4 }),
    prisma.shortPost.findMany({ orderBy: { publishedAt: "desc" }, take: 4 }),
    prisma.studioTemplate.findMany({ where: { isPublished: true }, orderBy: { updatedAt: "desc" }, take: 4 })
  ]);

  const candidates: Candidate[] = [
    ...shows.map((show, index) => ({ id: `show:${show.id}`, kind: "feed_post" as const, baseScore: 1 - index * 0.05 })),
    ...shorts.map((short, index) => ({ id: `short:${short.id}`, kind: "short" as const, baseScore: 0.95 - index * 0.05 })),
    ...templates.map((template, index) => ({ id: `template:${template.id}`, kind: "game" as const, baseScore: 0.9 - index * 0.05 }))
  ];

  const scored = scoreCandidatesForEntity(cacheKey, candidates);
  const scoreById = new Map(scored.map((candidate) => [candidate.id, candidate.score]));

  return {
    continueWatching: shows.slice(0, 3).map((show) => ({
      id: show.id,
      title: show.title,
      href: `/show/${show.slug}`,
      score: applyRankingPolicy(DEFAULT_RANKING_POLICY, {
        recency: scoreById.get(`show:${show.id}`) ?? 0.6,
        engagement: personalization.preferences.watch ?? 0.8,
        editorial: show.featured ? 1 : 0.4,
        trustPenalty: 0
      })
    })),
    forYourSquad: [
      {
        id: "party-now",
        title: "Start a Party room",
        href: "/party",
        score: applyRankingPolicy(DEFAULT_RANKING_POLICY, {
          recency: 0.8,
          engagement: personalization.preferences.party ?? 0.8,
          editorial: 0.6,
          trustPenalty: 0
        })
      },
      {
        id: "games-catalog",
        title: "Bring your squad into Games",
        href: "/games",
        score: applyRankingPolicy(DEFAULT_RANKING_POLICY, {
          recency: 0.6,
          engagement: personalization.preferences.games ?? 0.7,
          editorial: 0.5,
          trustPenalty: 0
        })
      }
    ],
    creatorNext: templates.slice(0, 3).map((template) => ({
      id: template.id,
      title: template.title,
      href: `/studio?template=${template.id}`,
      score: applyRankingPolicy(DEFAULT_RANKING_POLICY, {
        recency: scoreById.get(`template:${template.id}`) ?? 0.5,
        engagement: personalization.preferences.studio ?? 0.6,
        editorial: template.isPublished ? 0.8 : 0.3,
        trustPenalty: 0
      })
    })),
    diagnostics: {
      cacheKey,
      currentModule: input.session.currentModule,
      trailDepth: input.session.trail.length
    }
  };
}
