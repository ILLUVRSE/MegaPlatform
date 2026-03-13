import { prisma } from "@illuvrse/db";

export type StudioWatchAnalyticsMetric = {
  value: number | null;
  available: boolean;
  detail: string;
};

export type StudioShowWatchAnalytics = {
  scope: "show";
  publishedToWatch: boolean;
  watchHref: string | null;
  watchShowSlug: string | null;
  publishedEpisodes: number;
  syncedWatchEpisodes: number;
  views: StudioWatchAnalyticsMetric;
  reactions: StudioWatchAnalyticsMetric;
  completions: StudioWatchAnalyticsMetric;
  publishedShorts: StudioWatchAnalyticsMetric;
};

export type StudioEpisodeWatchAnalytics = {
  scope: "episode";
  publishedToWatch: boolean;
  watchHref: string | null;
  watchEpisodeId: string | null;
  views: StudioWatchAnalyticsMetric;
  reactions: StudioWatchAnalyticsMetric;
  completions: StudioWatchAnalyticsMetric;
  publishedShorts: StudioWatchAnalyticsMetric;
};

type IdSlugRow = {
  id: string;
  slug: string;
};

type StudioEpisodeRow = {
  id: string;
  status: string;
};

type CountRow = {
  count: number;
};

type LikesRow = {
  likes: number;
  posts: number;
};

function unavailableMetric(detail: string): StudioWatchAnalyticsMetric {
  return { value: null, available: false, detail };
}

function availableMetric(value: number, detail: string): StudioWatchAnalyticsMetric {
  return { value, available: true, detail };
}

function completionMetric(): StudioWatchAnalyticsMetric {
  return unavailableMetric(
    "Completion events are not retained yet. Watch currently clears progress near the finish line instead of storing a durable completion record."
  );
}

async function countPublishedShortsForShow(showProjectId: string) {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::int AS "count"
    FROM "ShortPost" short
    WHERE EXISTS (
      SELECT 1
      FROM "ShowEpisode" episode
      WHERE episode."showProjectId" = ${showProjectId}
        AND episode."id" = short."sourceEpisodeId"
    )
  `;

  return rows[0]?.count ?? 0;
}

export async function getStudioShowWatchAnalytics(showProjectId: string): Promise<StudioShowWatchAnalytics> {
  const [watchShowRows, showEpisodeRows, publishedShorts] = await Promise.all([
    prisma.$queryRaw<IdSlugRow[]>`
      SELECT "id", "slug"
      FROM "Show"
      WHERE "sourceShowProjectId" = ${showProjectId}
      LIMIT 1
    `,
    prisma.$queryRaw<StudioEpisodeRow[]>`
      SELECT "id", "status"::text AS "status"
      FROM "ShowEpisode"
      WHERE "showProjectId" = ${showProjectId}
    `,
    countPublishedShortsForShow(showProjectId)
  ]);

  const watchShow = watchShowRows[0] ?? null;
  const publishedEpisodes = showEpisodeRows.filter((episode) => episode.status === "PUBLISHED").length;

  if (!watchShow) {
    return {
      scope: "show",
      publishedToWatch: false,
      watchHref: null,
      watchShowSlug: null,
      publishedEpisodes,
      syncedWatchEpisodes: 0,
      views: unavailableMetric("Publish this show to Watch before analytics can roll up."),
      reactions: unavailableMetric("Reactions appear after the show is published and gets Watch feed posts."),
      completions: completionMetric(),
      publishedShorts:
        showEpisodeRows.length === 0
          ? unavailableMetric("No episodes exist yet, so there are no linked shorts to count.")
          : availableMetric(publishedShorts, "Published shorts linked back to episodes in this show.")
    };
  }

  const [syncedWatchEpisodeRows, viewsRows, likesRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT watch."id"
      FROM "Episode" watch
      INNER JOIN "ShowEpisode" studio ON studio."id" = watch."sourceShowEpisodeId"
      WHERE studio."showProjectId" = ${showProjectId}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "WatchProgress" progress
      INNER JOIN "Episode" watch ON watch."id" = progress."episodeId"
      INNER JOIN "ShowEpisode" studio ON studio."id" = watch."sourceShowEpisodeId"
      WHERE studio."showProjectId" = ${showProjectId}
    `,
    prisma.$queryRaw<LikesRow[]>`
      SELECT
        COALESCE(SUM(post."likeCount"), 0)::int AS "likes",
        COUNT(post."id")::int AS "posts"
      FROM "FeedPost" post
      WHERE post."showId" = ${watchShow.id}
         OR EXISTS (
           SELECT 1
           FROM "Episode" watch
           INNER JOIN "ShowEpisode" studio ON studio."id" = watch."sourceShowEpisodeId"
           WHERE studio."showProjectId" = ${showProjectId}
             AND watch."id" = post."episodeId"
         )
    `
  ]);

  const views = viewsRows[0]?.count ?? 0;
  const likes = likesRows[0]?.likes ?? 0;
  const reactionPosts = likesRows[0]?.posts ?? 0;

  return {
    scope: "show",
    publishedToWatch: true,
    watchHref: `/watch/show/${watchShow.slug}`,
    watchShowSlug: watchShow.slug,
    publishedEpisodes,
    syncedWatchEpisodes: syncedWatchEpisodeRows.length,
    views: availableMetric(
      views,
      views > 0
        ? "Tracked viewers with saved Watch progress across published episodes."
        : "No saved Watch progress yet for this show's synced episodes."
    ),
    reactions:
      reactionPosts > 0
        ? availableMetric(likes, "Aggregated likes from Watch feed posts tied to this show or its synced episodes.")
        : unavailableMetric("No Watch feed posts are linked to this show yet, so reaction totals are unavailable."),
    completions: completionMetric(),
    publishedShorts: availableMetric(
      publishedShorts,
      publishedShorts > 0
        ? "Published shorts linked back to episodes in this show."
        : "No published shorts are linked back to this show's episodes yet."
    )
  };
}

export async function getStudioEpisodeWatchAnalytics(showEpisodeId: string): Promise<StudioEpisodeWatchAnalytics> {
  const [watchEpisodeRows, publishedShortsRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Episode"
      WHERE "sourceShowEpisodeId" = ${showEpisodeId}
      LIMIT 1
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "ShortPost"
      WHERE "sourceEpisodeId" = ${showEpisodeId}
    `
  ]);

  const watchEpisode = watchEpisodeRows[0] ?? null;
  const publishedShorts = publishedShortsRows[0]?.count ?? 0;

  if (!watchEpisode) {
    return {
      scope: "episode",
      publishedToWatch: false,
      watchHref: null,
      watchEpisodeId: null,
      views: unavailableMetric("Publish this episode to Watch before analytics can roll up."),
      reactions: unavailableMetric("Reactions appear after the episode is published and gets Watch feed posts."),
      completions: completionMetric(),
      publishedShorts: availableMetric(publishedShorts, "Published shorts linked back to this source episode.")
    };
  }

  const [viewsRows, likesRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "WatchProgress"
      WHERE "episodeId" = ${watchEpisode.id}
    `,
    prisma.$queryRaw<LikesRow[]>`
      SELECT
        COALESCE(SUM("likeCount"), 0)::int AS "likes",
        COUNT("id")::int AS "posts"
      FROM "FeedPost"
      WHERE "episodeId" = ${watchEpisode.id}
    `
  ]);

  const views = viewsRows[0]?.count ?? 0;
  const likes = likesRows[0]?.likes ?? 0;
  const reactionPosts = likesRows[0]?.posts ?? 0;

  return {
    scope: "episode",
    publishedToWatch: true,
    watchHref: `/watch/episode/${watchEpisode.id}`,
    watchEpisodeId: watchEpisode.id,
    views: availableMetric(
      views,
      views > 0
        ? "Tracked viewers with saved Watch progress for this synced episode."
        : "No saved Watch progress yet for this synced episode."
    ),
    reactions:
      reactionPosts > 0
        ? availableMetric(likes, "Aggregated likes from Watch feed posts tied to this episode.")
        : unavailableMetric("No Watch feed posts are linked to this episode yet, so reaction totals are unavailable."),
    completions: completionMetric(),
    publishedShorts: availableMetric(
      publishedShorts,
      publishedShorts > 0
        ? "Published shorts linked back to this source episode."
        : "No published shorts are linked back to this source episode yet."
    )
  };
}
