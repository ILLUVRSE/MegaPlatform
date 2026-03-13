import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import {
  ReleaseScheduleError,
  type PremiereType,
  normalizeReleaseSchedule
} from "@/lib/releaseScheduling";
import {
  buildShowEpisodePublishQc,
  buildShowProjectPublishQc,
  type StudioPublishQcResult
} from "@/lib/studioPublishQc";
import { WATCH_PLACEHOLDER_ASSET_URL } from "@/lib/studioWatchPublishConfig";
const DEFAULT_EPISODE_RUNTIME_SECONDS = 60;

type PublishableShowProject = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: "SERIES" | "MOVIE";
  status: "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
  publishedAt: Date | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
  premiereType: PremiereType;
  releaseAt: Date | null;
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
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
  premiereType: PremiereType;
  releaseAt: Date | null;
  isPremiereEnabled: boolean;
  premiereStartsAt: Date | null;
  premiereEndsAt: Date | null;
  chatEnabled: boolean;
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
  details: unknown;

  constructor(message: string, status = 400, details: unknown = null) {
    super(message);
    this.name = "StudioPublishError";
    this.status = status;
    this.details = details;
  }
}

type PublishScheduleInput = {
  premiereType?: PremiereType | null;
  releaseAt?: Date | null;
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED" | null;
  allowedRegions?: string[] | null;
  requiresEntitlement?: boolean | null;
  isPremiereEnabled?: boolean | null;
  premiereStartsAt?: Date | null;
  premiereEndsAt?: Date | null;
  chatEnabled?: boolean | null;
};

type PremiereMetadata = {
  isPremiereEnabled: boolean;
  premiereStartsAt: Date | null;
  premiereEndsAt: Date | null;
  chatEnabled: boolean;
};

function buildSeasonTitle(project: PublishableShowProject, seasonNumber: number) {
  return project.format === "MOVIE" ? "Movie" : `Season ${seasonNumber}`;
}

function assertQcPassed(result: StudioPublishQcResult, message: string) {
  if (!result.canPublish) {
    throw new StudioPublishError(message, 409, { qc: result });
  }
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
      "visibility"::text AS "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "premiereType"::text AS "premiereType",
      "releaseAt",
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
      episode."visibility"::text AS "visibility",
      episode."allowedRegions",
      episode."requiresEntitlement",
      episode."premiereType"::text AS "premiereType",
      episode."releaseAt",
      episode."isPremiereEnabled",
      episode."premiereStartsAt",
      episode."premiereEndsAt",
      episode."chatEnabled",
      episode."templateType"::text AS "templateType"
    FROM "ShowEpisode" episode
    WHERE episode."id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function markProjectPublished(
  tx: Prisma.TransactionClient,
  projectId: string,
  input: {
    publishedAt: Date;
    premiereType: PremiereType;
    releaseAt: Date | null;
    visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
    allowedRegions: string[] | null;
    requiresEntitlement: boolean;
  }
) {
  const rows = await tx.$queryRaw<PublishableShowProject[]>`
    UPDATE "ShowProject"
    SET
      "status" = 'PUBLISHED'::"ShowProjectStatus",
      "publishedAt" = COALESCE("publishedAt", ${input.publishedAt}),
      "visibility" = ${input.visibility}::"ContentVisibility",
      "allowedRegions" = ${input.allowedRegions ?? []},
      "requiresEntitlement" = ${input.requiresEntitlement},
      "premiereType" = ${input.premiereType}::"PremiereType",
      "releaseAt" = ${input.releaseAt},
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
      "visibility"::text AS "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "premiereType"::text AS "premiereType",
      "releaseAt",
      "posterImageUrl",
      "bannerImageUrl"
  `;

  return rows[0] ?? null;
}

async function markEpisodePublished(
  tx: Prisma.TransactionClient,
  episodeId: string,
  input: {
    publishedAt: Date;
    premiereType: PremiereType;
    releaseAt: Date | null;
    visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
    allowedRegions: string[] | null;
    requiresEntitlement: boolean;
    isPremiereEnabled: boolean;
    premiereStartsAt: Date | null;
    premiereEndsAt: Date | null;
    chatEnabled: boolean;
  }
) {
  const rows = await tx.$queryRaw<PublishableShowEpisode[]>`
    UPDATE "ShowEpisode"
    SET
      "status" = 'PUBLISHED'::"ShowEpisodeStatus",
      "publishedAt" = COALESCE("publishedAt", ${input.publishedAt}),
      "visibility" = ${input.visibility}::"ContentVisibility",
      "allowedRegions" = ${input.allowedRegions ?? []},
      "requiresEntitlement" = ${input.requiresEntitlement},
      "premiereType" = ${input.premiereType}::"PremiereType",
      "releaseAt" = ${input.releaseAt},
      "isPremiereEnabled" = ${input.isPremiereEnabled},
      "premiereStartsAt" = ${input.premiereStartsAt},
      "premiereEndsAt" = ${input.premiereEndsAt},
      "chatEnabled" = ${input.chatEnabled},
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
      "visibility"::text AS "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "premiereType"::text AS "premiereType",
      "releaseAt",
      "isPremiereEnabled",
      "premiereStartsAt",
      "premiereEndsAt",
      "chatEnabled",
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
        "visibility" = ${project.visibility}::"ContentVisibility",
        "allowedRegions" = ${project.allowedRegions ?? []},
        "requiresEntitlement" = ${project.requiresEntitlement},
        "posterUrl" = ${project.posterImageUrl},
        "heroUrl" = ${project.bannerImageUrl},
        "premiereType" = ${project.premiereType}::"PremiereType",
        "releaseAt" = ${project.releaseAt},
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
      "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "posterUrl",
      "heroUrl",
      "premiereType",
      "releaseAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${project.id},
      ${project.title},
      ${project.slug},
      ${project.description},
      ${project.visibility}::"ContentVisibility",
      ${project.allowedRegions ?? []},
      ${project.requiresEntitlement},
      ${project.posterImageUrl},
      ${project.bannerImageUrl},
      ${project.premiereType}::"PremiereType",
      ${project.releaseAt},
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
        "visibility" = ${episode.visibility}::"ContentVisibility",
        "allowedRegions" = ${episode.allowedRegions ?? []},
        "requiresEntitlement" = ${episode.requiresEntitlement},
        "lengthSeconds" = ${lengthSeconds},
        "premiereType" = ${episode.premiereType}::"PremiereType",
        "releaseAt" = ${episode.releaseAt},
        "isPremiereEnabled" = ${episode.isPremiereEnabled},
        "premiereStartsAt" = ${episode.premiereStartsAt},
        "premiereEndsAt" = ${episode.premiereEndsAt},
        "chatEnabled" = ${episode.chatEnabled},
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
      "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "lengthSeconds",
      "assetUrl",
      "premiereType",
      "releaseAt",
      "isPremiereEnabled",
      "premiereStartsAt",
      "premiereEndsAt",
      "chatEnabled",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${episode.id},
      ${seasonId},
      ${episode.title},
      ${episode.synopsis},
      ${episode.visibility}::"ContentVisibility",
      ${episode.allowedRegions ?? []},
      ${episode.requiresEntitlement},
      ${episode.runtimeSeconds ?? DEFAULT_EPISODE_RUNTIME_SECONDS},
      ${WATCH_PLACEHOLDER_ASSET_URL},
      ${episode.premiereType}::"PremiereType",
      ${episode.releaseAt},
      ${episode.isPremiereEnabled},
      ${episode.premiereStartsAt},
      ${episode.premiereEndsAt},
      ${episode.chatEnabled},
      NOW(),
      NOW()
    )
    RETURNING "id"
  `;

  return insertedRows[0] ?? null;
}

function normalizePremiereMetadata(input: PublishScheduleInput, now = new Date()): PremiereMetadata {
  const isPremiereEnabled = Boolean(input.isPremiereEnabled);
  const premiereStartsAt = input.premiereStartsAt ?? null;
  const premiereEndsAt = input.premiereEndsAt ?? null;
  const chatEnabled = isPremiereEnabled && Boolean(input.chatEnabled);

  if (!isPremiereEnabled) {
    return {
      isPremiereEnabled: false,
      premiereStartsAt: null,
      premiereEndsAt: null,
      chatEnabled: false
    };
  }

  if (!premiereStartsAt || Number.isNaN(premiereStartsAt.getTime())) {
    throw new StudioPublishError("Premiere start time is required when live premiere is enabled.", 400);
  }

  if (premiereStartsAt.getTime() <= now.getTime()) {
    throw new StudioPublishError("Premiere start time must be in the future.", 400);
  }

  if (premiereEndsAt && Number.isNaN(premiereEndsAt.getTime())) {
    throw new StudioPublishError("Premiere end time is invalid.", 400);
  }

  if (premiereEndsAt && premiereEndsAt.getTime() <= premiereStartsAt.getTime()) {
    throw new StudioPublishError("Premiere end time must be after the premiere start time.", 400);
  }

  return {
    isPremiereEnabled,
    premiereStartsAt,
    premiereEndsAt,
    chatEnabled
  };
}

export async function publishShowProjectToWatch(slugOrId: string, publishInput?: PublishScheduleInput) {
  return prisma.$transaction(async (tx) => {
    const currentProject = await findProjectForPublish(tx, slugOrId);
    if (!currentProject) {
      throw new StudioPublishError("Show project not found.", 404);
    }
    assertQcPassed(buildShowProjectPublishQc(currentProject), "Pre-publish QC failed for this show.");

    const publishedAt = currentProject.publishedAt ?? new Date();
    let releaseSchedule;
    try {
      releaseSchedule = normalizeReleaseSchedule(
        publishInput ?? {
          premiereType: currentProject.premiereType,
          releaseAt: currentProject.releaseAt
        }
      );
    } catch (error) {
      if (error instanceof ReleaseScheduleError) {
        throw new StudioPublishError(error.message, 400);
      }
      throw error;
    }

    const project = await markProjectPublished(tx, currentProject.id, {
      publishedAt,
      visibility: publishInput?.visibility ?? currentProject.visibility,
      allowedRegions: publishInput?.allowedRegions ?? currentProject.allowedRegions,
      requiresEntitlement: publishInput?.requiresEntitlement ?? currentProject.requiresEntitlement,
      ...releaseSchedule
    });
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

export async function publishShowEpisodeToWatch(id: string, publishInput?: PublishScheduleInput) {
  return prisma.$transaction(async (tx) => {
    const currentEpisode = await findEpisodeForPublish(tx, id);
    if (!currentEpisode) {
      throw new StudioPublishError("Episode not found.", 404);
    }
    if (!currentEpisode.showProjectId) {
      throw new StudioPublishError("Cannot publish episode without parent show.", 400);
    }

    const currentProject = await findProjectForPublish(tx, currentEpisode.showProjectId);
    if (!currentProject) {
      throw new StudioPublishError("Cannot publish episode without parent show.", 400);
    }
    const currentWatchEpisodeRows = await tx.$queryRaw<Array<{ assetUrl: string | null }>>`
      SELECT "assetUrl"
      FROM "Episode"
      WHERE "sourceShowEpisodeId" = ${currentEpisode.id}
      LIMIT 1
    `;
    assertQcPassed(
      buildShowEpisodePublishQc({
        episode: currentEpisode,
        parentShow: currentProject,
        watchEpisode: currentWatchEpisodeRows[0] ?? null
      }),
      "Pre-publish QC failed for this episode."
    );

    const publishedAt = currentEpisode.publishedAt ?? new Date();
    let releaseSchedule;
    let premiereMetadata;
    try {
      releaseSchedule = normalizeReleaseSchedule(
        publishInput ?? {
          premiereType: currentEpisode.premiereType,
          releaseAt: currentEpisode.releaseAt
        }
      );
      premiereMetadata = normalizePremiereMetadata(
        publishInput ?? {
          isPremiereEnabled: currentEpisode.isPremiereEnabled,
          premiereStartsAt: currentEpisode.premiereStartsAt,
          premiereEndsAt: currentEpisode.premiereEndsAt,
          chatEnabled: currentEpisode.chatEnabled
        }
      );
    } catch (error) {
      if (error instanceof ReleaseScheduleError) {
        throw new StudioPublishError(error.message, 400);
      }
      throw error;
    }

    const project = await markProjectPublished(tx, currentProject.id, {
      publishedAt,
      visibility: currentProject.visibility,
      allowedRegions: currentProject.allowedRegions,
      requiresEntitlement: currentProject.requiresEntitlement,
      premiereType: currentProject.premiereType,
      releaseAt: currentProject.releaseAt
    });
    if (!project) {
      throw new StudioPublishError("Unable to publish parent show.", 500);
    }

    const episode = await markEpisodePublished(tx, currentEpisode.id, {
      publishedAt,
      visibility: publishInput?.visibility ?? currentEpisode.visibility,
      allowedRegions: publishInput?.allowedRegions ?? currentEpisode.allowedRegions,
      requiresEntitlement: publishInput?.requiresEntitlement ?? currentEpisode.requiresEntitlement,
      premiereType:
        premiereMetadata.isPremiereEnabled || releaseSchedule.premiereType === "SCHEDULED" ? "SCHEDULED" : "IMMEDIATE",
      releaseAt: premiereMetadata.isPremiereEnabled ? premiereMetadata.premiereStartsAt : releaseSchedule.releaseAt,
      ...premiereMetadata
    });
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
