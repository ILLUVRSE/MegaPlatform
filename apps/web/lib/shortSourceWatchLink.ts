import { Prisma, prisma } from "@illuvrse/db";

type ShortSourceRecord = {
  id: string;
  sourceShowId: string | null;
  sourceEpisodeId: string | null;
  sourceTimestampSeconds: number | null;
};

type ResolvedWatchLink = {
  href: string;
  label: string;
};

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function buildWatchEpisodeHref(episodeId: string, timestampSeconds: number | null) {
  return `/watch/episode/${episodeId}${buildQuery({
    t: timestampSeconds !== null && timestampSeconds >= 0 ? timestampSeconds : undefined
  })}`;
}

function buildWatchShowHref(showSlug: string, timestampSeconds: number | null) {
  return `/watch/show/${showSlug}${buildQuery({
    t: timestampSeconds !== null && timestampSeconds >= 0 ? timestampSeconds : undefined
  })}`;
}

export async function resolveShortSourceWatchLinks(items: ShortSourceRecord[]) {
  const episodeIds = Array.from(
    new Set(items.map((item) => item.sourceEpisodeId).filter((value): value is string => Boolean(value)))
  );
  const showIds = Array.from(
    new Set(items.map((item) => item.sourceShowId).filter((value): value is string => Boolean(value)))
  );

  const episodeRows =
    episodeIds.length > 0
      ? await prisma.$queryRaw<Array<{ sourceShowEpisodeId: string; id: string }>>`
          SELECT "sourceShowEpisodeId", "id"
          FROM "Episode"
          WHERE "sourceShowEpisodeId" IN (${Prisma.join(episodeIds.map((id) => Prisma.sql`${id}`))})
        `
      : [];

  const showRows =
    showIds.length > 0
      ? await prisma.$queryRaw<Array<{ sourceShowProjectId: string; slug: string }>>`
          SELECT "sourceShowProjectId", "slug"
          FROM "Show"
          WHERE "sourceShowProjectId" IN (${Prisma.join(showIds.map((id) => Prisma.sql`${id}`))})
        `
      : [];

  const watchEpisodeIdBySourceEpisodeId = new Map(
    episodeRows.map((row) => [row.sourceShowEpisodeId, row.id])
  );
  const watchShowSlugBySourceShowId = new Map(
    showRows.map((row) => [row.sourceShowProjectId, row.slug])
  );

  const links = new Map<string, ResolvedWatchLink>();

  for (const item of items) {
    const watchEpisodeId = item.sourceEpisodeId
      ? watchEpisodeIdBySourceEpisodeId.get(item.sourceEpisodeId) ?? null
      : null;

    if (watchEpisodeId) {
      links.set(item.id, {
        href: buildWatchEpisodeHref(watchEpisodeId, item.sourceTimestampSeconds),
        label: "Watch full episode"
      });
      continue;
    }

    const watchShowSlug = item.sourceShowId
      ? watchShowSlugBySourceShowId.get(item.sourceShowId) ?? null
      : null;

    if (watchShowSlug) {
      links.set(item.id, {
        href: buildWatchShowHref(watchShowSlug, item.sourceTimestampSeconds),
        label: "Watch full episode"
      });
    }
  }

  return links;
}
