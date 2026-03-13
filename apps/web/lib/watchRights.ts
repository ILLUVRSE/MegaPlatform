import { Prisma, prisma } from "@illuvrse/db";

export type WatchRightsRecord = {
  id: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[];
  requiresEntitlement: boolean;
};

export function mergeWatchVisibility(
  parentVisibility: WatchRightsRecord["visibility"],
  childVisibility: WatchRightsRecord["visibility"]
) {
  if (parentVisibility === "PRIVATE" || childVisibility === "PRIVATE") {
    return "PRIVATE" as const;
  }
  if (parentVisibility === "UNLISTED" || childVisibility === "UNLISTED") {
    return "UNLISTED" as const;
  }
  return "PUBLIC" as const;
}

export async function listWatchShowRights(showIds: string[]) {
  if (showIds.length === 0) {
    return new Map<string, WatchRightsRecord>();
  }

  const rows = await prisma.$queryRaw<WatchRightsRecord[]>`
    SELECT
      "id",
      "visibility"::text AS "visibility",
      "allowedRegions",
      "requiresEntitlement"
    FROM "Show"
    WHERE "id" IN (${Prisma.join(showIds)})
  `;

  return new Map(rows.map((row) => [row.id, row]));
}

export async function listWatchEpisodeRights(episodeIds: string[]) {
  if (episodeIds.length === 0) {
    return new Map<string, WatchRightsRecord>();
  }

  const rows = await prisma.$queryRaw<WatchRightsRecord[]>`
    SELECT
      "id",
      "visibility"::text AS "visibility",
      "allowedRegions",
      "requiresEntitlement"
    FROM "Episode"
    WHERE "id" IN (${Prisma.join(episodeIds)})
  `;

  return new Map(rows.map((row) => [row.id, row]));
}

export async function searchPublicShowsByTitle(query: string, limit: number) {
  return prisma.$queryRaw<Array<{ id: string; title: string; slug: string; description: string | null }>>`
    SELECT "id", "title", "slug", "description"
    FROM "Show"
    WHERE "visibility" = 'PUBLIC'::"ContentVisibility"
      AND "title" ILIKE ${`%${query}%`}
    ORDER BY "updatedAt" DESC
    LIMIT ${limit}
  `;
}

export async function listPublicRecommendationShows(limit: number) {
  return prisma.$queryRaw<Array<{ id: string; title: string; slug: string; featured: boolean }>>`
    SELECT "id", "title", "slug", "featured"
    FROM "Show"
    WHERE "visibility" = 'PUBLIC'::"ContentVisibility"
    ORDER BY "featured" DESC, "updatedAt" DESC
    LIMIT ${limit}
  `;
}
