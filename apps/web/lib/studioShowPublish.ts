import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";

const WATCH_PLACEHOLDER_ASSET_URL = "https://cdn.illuvrse.dev/assets/placeholder-episode.mp4";
const DEFAULT_EPISODE_RUNTIME_SECONDS = 60;

type PublishableShowProject = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: "SERIES" | "MOVIE";
  status: "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
  publishedAt: Date | null;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
};

type PublishableShowEpisode = {
  id: string;
  showProjectId: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  slug: string;
  synopsis: string | null;
  runtimeSeconds: number | null;
  status: "DRAFT" | "READY" | "PUBLISHED";
  publishedAt: Date | null;
  templateType: "STANDARD_EPISODE" | "COLD_OPEN_EPISODE" | "MOVIE_CHAPTER";
};

type WatchShowRow = {
  id: string;
  slug: string;
};

type WatchSeasonRow = {
  id: string;
  number: number;
};

type WatchEpisodeRow = {
  id: string;
};

export class StudioPublishError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StudioPublishError";
    this.status = status;
  }
}

function requirePublishTitle(title: string | null | undefined, kind: "show" | "episode") {
  if (!title?.trim()) {
    throw new StudioPublishError(`Cannot publish ${kind} without a title.`, 400);
  }
}

function buildSeasonTitle(project: PublishableShowProject, seasonNumber: number) {
  return project.format === "MOVIE" ? "Movie" : `Season ${seasonNumber}`;
}

async function findProjectForPublish(
  tx: Prisma.TransactionClient,
  slugOrId: string
) {
  const rows = await tx.$queryRaw<PublishableShowProject[]>`
    SELECT
      "id",
      "slug",
      "title",
      "description",
      "format"::text AS "format",
      "status"::text AS "status",
      "publishedAt",
      "posterImageUrl",
      "bannerImageUrl"
    FROM "ShowProject"
    WHERE "id" = ${slugOrId} OR "slug" = ${slugOrId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function findEpisodeForPublish(
  tx: Prisma.TransactionClient,
  id: string
) {
  const rows = await tx.$queryRaw<PublishableShowEpisode[]>`
    SELECT
      episode."id",
      episode."showProjectId",
      episode."seasonNumber",
      episode."episodeNumber",
      episode."title",
      episode."slug",
      episode."synopsis",
      episode."runtimeSeconds",
      episode."status"::text AS "status",
      episode."publishedAt",
      episode."templateType"::text AS "templateType"
    FROM "ShowEpisode" episode
    WHERE episode."id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function markProjectPublished(tx: Prisma.TransactionClient, projectId: string, publishedAt: Date) {
  const rows = await tx.$queryRaw<PublishableShowProject[]>`
    UPDATE "ShowProject"
    SET
      "status" = 'PUBLISHED'::"ShowProjectStatus",
      "publishedAt" = COALESCE("publishedAt", ${publishedAt}),
      "updatedAt" = NOW()
    WHERE "id" = ${projectId}
    RETURNING
      "id",
      "slug",
      "title",
      "description",
      "format"::text AS "format",
      "status"::text AS "status",
      "publishedAt",
      "posterImageUrl",
      "bannerImageUrl"
  `;

  return rows[0] ?? null;
}

async function markEpisodePublished(tx: Prisma.TransactionClient, episodeId: string, publishedAt: Date) {
  const rows = await tx.$queryRaw<PublishableShowEpisode[]>`
    UPDATE "ShowEpisode"
    SET
      "status" = 'PUBLISHED'::"ShowEpisodeStatus",
      "publishedAt" = COALESCE("publishedAt", ${publishedAt}),
      "updatedAt" = NOW()
    WHERE "id" = ${episodeId}
    RETURNING
      "id",
      "showProjectId",
      "seasonNumber",
      "episodeNumber",
      "title",
      "slug",
      "synopsis",
      "runtimeSeconds",
      "status"::text AS "status",
      "publishedAt",
      "templateType"::text AS "templateType"
  `;

  return rows[0] ?? null;
}

async function upsertWatchShow(tx: Prisma.TransactionClient, project: PublishableShowProject) {
  const existingRows = await tx.$queryRaw<WatchShowRow[]>`
    SELECT "id", "slug"
    FROM "Show"
    WHERE "sourceShowProjectId" = ${project.id} OR "slug" = ${project.slug}
    ORDER BY CASE WHEN "sourceShowProjectId" = ${project.id} THEN 0 ELSE 1 END ASC
    LIMIT 1
  `;

  const existing = existingRows[0] ?? null;
  if (existing) {
    const updatedRows = await tx.$queryRaw<WatchShowRow[]>`
      UPDATE "Show"
      SET
        "sourceShowProjectId" = ${project.id},
        "title" = ${project.title},
        "slug" = ${project.slug},
        "description" = ${project.description},
        "posterUrl" = ${project.posterImageUrl},
        "heroUrl" = ${project.bannerImageUrl},
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
      RETURNING "id", "slug"
    `;

    return updatedRows[0] ?? null;
  }

  const insertedRows = await tx.$queryRaw<WatchShowRow[]>`
    INSERT INTO "Show" (
      "id",
      "sourceShowProjectId",
      "title",
      "slug",
      "description",
      "posterUrl",
      "heroUrl",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${project.id},
      ${project.title},
      ${project.slug},
      ${project.description},
      ${project.posterImageUrl},
      ${project.bannerImageUrl},
      NOW(),
      NOW()
    )
    RETURNING "id", "slug"
  `;

  return insertedRows[0] ?? null;
}

async function upsertWatchSeason(
  tx: Prisma.TransactionClient,
  showId: string,
  project: PublishableShowProject,
  seasonNumber: number
) {
  const seasonTitle = buildSeasonTitle(project, seasonNumber);
  const existingRows = await tx.$queryRaw<WatchSeasonRow[]>`
    SELECT "id", "number"
    FROM "Season"
    WHERE "showId" = ${showId} AND "number" = ${seasonNumber}
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  const existing = existingRows[0] ?? null;
  if (existing) {
    const updatedRows = await tx.$queryRaw<WatchSeasonRow[]>`
      UPDATE "Season"
      SET
        "title" = ${seasonTitle},
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
      RETURNING "id", "number"
    `;

    return updatedRows[0] ?? null;
  }

  const insertedRows = await tx.$queryRaw<WatchSeasonRow[]>`
    INSERT INTO "Season" (
      "id",
      "showId",
      "number",
      "title",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${showId},
      ${seasonNumber},
      ${seasonTitle},
      NOW(),
      NOW()
    )
    RETURNING "id", "number"
  `;

  return insertedRows[0] ?? null;
}

async function upsertWatchEpisode(
  tx: Prisma.TransactionClient,
  seasonId: string,
  episode: PublishableShowEpisode
) {
  const existingRows = await tx.$queryRaw<Array<WatchEpisodeRow & { lengthSeconds: number; assetUrl: string }>>`
    SELECT "id", "lengthSeconds", "assetUrl"
    FROM "Episode"
    WHERE "sourceShowEpisodeId" = ${episode.id}
    LIMIT 1
  `;

  const nextRuntime = episode.runtimeSeconds ?? null;
  const existing = existingRows[0] ?? null;
  if (existing) {
    const lengthSeconds =
      nextRuntime ?? (existing.lengthSeconds > 0 ? existing.lengthSeconds : DEFAULT_EPISODE_RUNTIME_SECONDS);
    const updatedRows = await tx.$queryRaw<WatchEpisodeRow[]>`
      UPDATE "Episode"
      SET
        "seasonId" = ${seasonId},
        "sourceShowEpisodeId" = ${episode.id},
        "title" = ${episode.title},
        "description" = ${episode.synopsis},
        "lengthSeconds" = ${lengthSeconds},
        "assetUrl" = CASE
          WHEN "assetUrl" = '' THEN ${WATCH_PLACEHOLDER_ASSET_URL}
          ELSE "assetUrl"
        END,
        "updatedAt" = NOW()
      WHERE "id" = ${existing.id}
      RETURNING "id"
    `;

    return updatedRows[0] ?? null;
  }

  const insertedRows = await tx.$queryRaw<WatchEpisodeRow[]>`
    INSERT INTO "Episode" (
      "id",
      "sourceShowEpisodeId",
      "seasonId",
      "title",
      "description",
      "lengthSeconds",
      "assetUrl",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${episode.id},
      ${seasonId},
      ${episode.title},
      ${episode.synopsis},
      ${episode.runtimeSeconds ?? DEFAULT_EPISODE_RUNTIME_SECONDS},
      ${WATCH_PLACEHOLDER_ASSET_URL},
      NOW(),
      NOW()
    )
    RETURNING "id"
  `;

  return insertedRows[0] ?? null;
}

export async function publishShowProjectToWatch(slugOrId: string) {
  return prisma.$transaction(async (tx) => {
    const currentProject = await findProjectForPublish(tx, slugOrId);
    if (!currentProject) {
      throw new StudioPublishError("Show project not found.", 404);
    }

    requirePublishTitle(currentProject.title, "show");

    const publishedAt = currentProject.publishedAt ?? new Date();
    const project = await markProjectPublished(tx, currentProject.id, publishedAt);
    if (!project) {
      throw new StudioPublishError("Unable to publish show project.", 500);
    }

    const watchShow = await upsertWatchShow(tx, project);
    if (!watchShow) {
      throw new StudioPublishError("Unable to sync show metadata to Watch.", 500);
    }

    return {
      project,
      watchShow
    };
  });
}

export async function publishShowEpisodeToWatch(id: string) {
  return prisma.$transaction(async (tx) => {
    const currentEpisode = await findEpisodeForPublish(tx, id);
    if (!currentEpisode) {
      throw new StudioPublishError("Episode not found.", 404);
    }
    if (!currentEpisode.showProjectId) {
      throw new StudioPublishError("Cannot publish episode without parent show.", 400);
    }

    requirePublishTitle(currentEpisode.title, "episode");

    const currentProject = await findProjectForPublish(tx, currentEpisode.showProjectId);
    if (!currentProject) {
      throw new StudioPublishError("Cannot publish episode without parent show.", 400);
    }

    requirePublishTitle(currentProject.title, "show");

    const publishedAt = currentEpisode.publishedAt ?? new Date();
    const project = await markProjectPublished(tx, currentProject.id, publishedAt);
    if (!project) {
      throw new StudioPublishError("Unable to publish parent show.", 500);
    }

    const episode = await markEpisodePublished(tx, currentEpisode.id, publishedAt);
    if (!episode) {
      throw new StudioPublishError("Unable to publish episode.", 500);
    }

    const watchShow = await upsertWatchShow(tx, project);
    if (!watchShow) {
      throw new StudioPublishError("Unable to sync show metadata to Watch.", 500);
    }

    const seasonNumber = episode.seasonNumber ?? 1;
    const watchSeason = await upsertWatchSeason(tx, watchShow.id, project, seasonNumber);
    if (!watchSeason) {
      throw new StudioPublishError("Unable to sync season metadata to Watch.", 500);
    }

    const watchEpisode = await upsertWatchEpisode(tx, watchSeason.id, episode);
    if (!watchEpisode) {
      throw new StudioPublishError("Unable to sync episode metadata to Watch.", 500);
    }

    return {
      project,
      episode,
      watchShow,
      watchSeason,
      watchEpisode
    };
  });
}
