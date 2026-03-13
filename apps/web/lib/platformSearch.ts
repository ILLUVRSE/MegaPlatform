import { prisma } from "@illuvrse/db";
import { getPlatformDirectoryEntries } from "@/lib/platformApps";
import { scoreCandidatesForEntity, type Candidate } from "@/lib/intelligence/candidateService";
import { searchPublicShowsByTitle } from "@/lib/watchRights";

export type PlatformSearchResult = {
  id: string;
  kind: "show" | "creator" | "game" | "app" | "party" | "template";
  title: string;
  href: string;
  summary: string;
  score: number;
};

function containsIgnoreCase(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

function toCandidateScore(query: string, title: string, baseKind: Candidate["kind"]): Candidate {
  const exact = title.toLowerCase().startsWith(query.toLowerCase()) ? 0.4 : 0;
  return {
    id: title,
    kind: baseKind,
    baseScore: Number((0.6 + exact).toFixed(4))
  };
}

export async function searchPlatform(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [shows, creators, templates, parties] = await Promise.all([
    searchPublicShowsByTitle(trimmed, 5),
    prisma.creatorProfile.findMany({
      where: {
        OR: [
          { displayName: { contains: trimmed, mode: "insensitive" } },
          { handle: { contains: trimmed, mode: "insensitive" } }
        ]
      },
      take: 5
    }),
    prisma.studioTemplate.findMany({
      where: { title: { contains: trimmed, mode: "insensitive" } },
      take: 5
    }),
    prisma.party.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      take: 5
    })
  ]);

  const appResults = getPlatformDirectoryEntries()
    .filter((entry) => containsIgnoreCase(entry.name, trimmed) || containsIgnoreCase(entry.summary, trimmed))
    .slice(0, 6)
    .map((entry) => ({
      id: `app:${entry.href}`,
      kind: "app" as const,
      title: entry.name,
      href: entry.href,
      summary: entry.summary,
      score: 0
    }));

  const gameResults = [
    {
      id: "game:/games",
      kind: "game" as const,
      title: "ILLUVRSE Games",
      href: "/games",
      summary: "Open the games catalog and creator launches.",
      score: 0
    }
  ].filter((entry) => containsIgnoreCase(entry.title, trimmed) || containsIgnoreCase(entry.summary, trimmed));

  const unsorted: PlatformSearchResult[] = [
    ...shows.map((show) => ({
      id: `show:${show.id}`,
      kind: "show" as const,
      title: show.title,
      href: `/show/${show.slug}`,
      summary: show.description ?? "Watch catalog title",
      score: 0
    })),
    ...creators.map((creator) => ({
      id: `creator:${creator.id}`,
      kind: "creator" as const,
      title: creator.displayName,
      href: `/studio/control-center?creator=${creator.handle}`,
      summary: `@${creator.handle}`,
      score: 0
    })),
    ...templates.map((template) => ({
      id: `template:${template.id}`,
      kind: "template" as const,
      title: template.title,
      href: `/studio?template=${template.id}`,
      summary: template.description ?? "Studio template",
      score: 0
    })),
    ...parties.map((party) => ({
      id: `party:${party.id}`,
      kind: "party" as const,
      title: party.name,
      href: `/party/${party.code}`,
      summary: "Live party room",
      score: 0
    })),
    ...appResults,
    ...gameResults
  ];

  const scoredCandidates = scoreCandidatesForEntity(
    `search:${trimmed.toLowerCase()}`,
    unsorted.map((entry) =>
      toCandidateScore(trimmed, entry.title, entry.kind === "game" ? "game" : entry.kind === "app" ? "game" : "feed_post")
    )
  );
  const scoreById = new Map(scoredCandidates.map((candidate) => [candidate.id, candidate.score]));

  return unsorted
    .map((entry) => ({
      ...entry,
      score: scoreById.get(entry.title) ?? 0.5
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
