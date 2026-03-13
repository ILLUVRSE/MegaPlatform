import { Prisma, prisma } from "@illuvrse/db";

export type WatchChapterMarker = {
  sceneId: string;
  sceneNumber: number;
  title: string;
  timestampSeconds: number | null;
};

type PublicEpisodeIdentity = {
  id: string;
  title: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

type StudioEpisodeRow = {
  id: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
};

function normalizeLookupTitle(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildOrdinalKey(seasonNumber: number | null, episodeNumber: number | null) {
  return seasonNumber !== null && episodeNumber !== null ? `${seasonNumber}:${episodeNumber}` : null;
}

function resolveStudioEpisode(
  episode: PublicEpisodeIdentity,
  byOrdinal: Map<string, StudioEpisodeRow>,
  byTitle: Map<string, StudioEpisodeRow[]>
) {
  const ordinalKey = buildOrdinalKey(episode.seasonNumber, episode.episodeNumber);
  if (ordinalKey) {
    const ordinalMatch = byOrdinal.get(ordinalKey);
    if (ordinalMatch) {
      return ordinalMatch;
    }
  }

  const normalizedTitle = normalizeLookupTitle(episode.title);
  const titleMatches = byTitle.get(normalizedTitle) ?? [];
  if (titleMatches.length === 1) {
    return titleMatches[0] ?? null;
  }

  if (episode.seasonNumber !== null) {
    const seasonScopedMatch =
      titleMatches.find((item) => item.seasonNumber === episode.seasonNumber) ?? null;
    if (seasonScopedMatch) {
      return seasonScopedMatch;
    }
  }

  return null;
}

export async function listWatchChapterMarkersByEpisode(
  showSlug: string,
  episodes: PublicEpisodeIdentity[]
) {
  if (episodes.length === 0) {
    return {} as Record<string, WatchChapterMarker[]>;
  }

  const showProjectRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ShowProject"
    WHERE "slug" = ${showSlug}
      AND "status" = 'PUBLISHED'::"ShowProjectStatus"
    LIMIT 1
  `;
  const showProjectId = showProjectRows[0]?.id;

  if (!showProjectId) {
    return {} as Record<string, WatchChapterMarker[]>;
  }

  const studioEpisodes = await prisma.$queryRaw<StudioEpisodeRow[]>`
    SELECT
      "id",
      "seasonNumber",
      "episodeNumber",
      "title"
    FROM "ShowEpisode"
    WHERE "showProjectId" = ${showProjectId}
      AND "status" = 'PUBLISHED'::"ShowEpisodeStatus"
    ORDER BY
      COALESCE("seasonNumber", 999999) ASC,
      COALESCE("episodeNumber", 999999) ASC,
      "createdAt" ASC
  `;

  if (studioEpisodes.length === 0) {
    return {} as Record<string, WatchChapterMarker[]>;
  }

  const studioEpisodesByOrdinal = new Map<string, StudioEpisodeRow>();
  const studioEpisodesByTitle = new Map<string, StudioEpisodeRow[]>();

  for (const studioEpisode of studioEpisodes) {
    const ordinalKey = buildOrdinalKey(studioEpisode.seasonNumber, studioEpisode.episodeNumber);
    if (ordinalKey && !studioEpisodesByOrdinal.has(ordinalKey)) {
      studioEpisodesByOrdinal.set(ordinalKey, studioEpisode);
    }

    const normalizedTitle = normalizeLookupTitle(studioEpisode.title);
    const existing = studioEpisodesByTitle.get(normalizedTitle) ?? [];
    existing.push(studioEpisode);
    studioEpisodesByTitle.set(normalizedTitle, existing);
  }

  const matchedStudioEpisodeIds = new Set<string>();
  const publicToStudioEpisodeIds = new Map<string, string>();

  for (const episode of episodes) {
    const studioEpisode = resolveStudioEpisode(episode, studioEpisodesByOrdinal, studioEpisodesByTitle);
    if (!studioEpisode) {
      continue;
    }

    matchedStudioEpisodeIds.add(studioEpisode.id);
    publicToStudioEpisodeIds.set(episode.id, studioEpisode.id);
  }

  if (matchedStudioEpisodeIds.size === 0) {
    return {} as Record<string, WatchChapterMarker[]>;
  }

  const studioEpisodeIdValues = Array.from(matchedStudioEpisodeIds).map((id) => Prisma.sql`${id}`);
  const sceneRows = await prisma.$queryRaw<
    Array<{
      showEpisodeId: string;
      id: string;
      sceneNumber: number;
      title: string;
      startIntentSeconds: number | null;
    }>
  >`
    SELECT
      "showEpisodeId",
      "id",
      "sceneNumber",
      "title",
      "startIntentSeconds"
    FROM "ShowScene"
    WHERE "showEpisodeId" IN (${Prisma.join(studioEpisodeIdValues)})
    ORDER BY "showEpisodeId" ASC, "sceneNumber" ASC, "createdAt" ASC
  `;

  const scenesByStudioEpisodeId = new Map<string, WatchChapterMarker[]>();
  for (const scene of sceneRows) {
    const existing = scenesByStudioEpisodeId.get(scene.showEpisodeId) ?? [];
    existing.push({
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      timestampSeconds: scene.startIntentSeconds
    });
    scenesByStudioEpisodeId.set(scene.showEpisodeId, existing);
  }

  const markersByEpisodeId: Record<string, WatchChapterMarker[]> = {};
  for (const episode of episodes) {
    const studioEpisodeId = publicToStudioEpisodeIds.get(episode.id);
    if (!studioEpisodeId) {
      continue;
    }

    const markers = scenesByStudioEpisodeId.get(studioEpisodeId) ?? [];
    if (markers.length > 0) {
      markersByEpisodeId[episode.id] = markers;
    }
  }

  return markersByEpisodeId;
}
