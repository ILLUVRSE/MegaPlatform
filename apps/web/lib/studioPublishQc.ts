import { prisma } from "@illuvrse/db";
import { WATCH_PLACEHOLDER_ASSET_URL } from "@/lib/studioWatchPublishConfig";

export type StudioPublishQcStatus = "pass" | "warn" | "fail";
export type StudioPublishQcSeverity = "info" | "warning" | "error";

export type StudioPublishQcCheck = {
  code: string;
  label: string;
  status: StudioPublishQcStatus;
  severity: StudioPublishQcSeverity;
  message: string;
  blocking: boolean;
};

export type StudioPublishQcResult = {
  targetType: "show" | "episode";
  targetId: string;
  canPublish: boolean;
  summary: {
    passes: number;
    warnings: number;
    errors: number;
    blockingFailures: number;
  };
  checks: StudioPublishQcCheck[];
};

type ShowQcRecord = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
};

type EpisodeQcRecord = {
  id: string;
  title: string | null;
  slug: string | null;
  synopsis: string | null;
  showProjectId: string | null;
};

type WatchEpisodeQcRecord = {
  assetUrl: string | null;
};

type EpisodeQcRow = EpisodeQcRecord & {
  projectId: string | null;
  projectTitle: string | null;
  projectSlug: string | null;
  projectDescription: string | null;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function createCheck(input: {
  code: string;
  label: string;
  status: StudioPublishQcStatus;
  severity?: StudioPublishQcSeverity;
  message: string;
  blocking?: boolean;
}): StudioPublishQcCheck {
  return {
    ...input,
    blocking: input.blocking ?? input.status === "fail",
    severity:
      input.severity ??
      (input.status === "fail" ? "error" : input.status === "warn" ? "warning" : "info")
  };
}

function createRequiredTextCheck(
  code: string,
  label: string,
  value: string | null | undefined,
  missingMessage: string
) {
  if (!hasValue(value)) {
    return createCheck({
      code,
      label,
      status: "fail",
      message: missingMessage
    });
  }

  return createCheck({
    code,
    label,
    status: "pass",
    blocking: false,
    message: `${label} is present.`
  });
}

function finalizeResult(targetType: "show" | "episode", targetId: string, checks: StudioPublishQcCheck[]): StudioPublishQcResult {
  const summary = checks.reduce(
    (acc, check) => {
      if (check.status === "pass") {
        acc.passes += 1;
      } else if (check.status === "warn") {
        acc.warnings += 1;
      } else {
        acc.errors += 1;
      }
      if (check.blocking && check.status === "fail") {
        acc.blockingFailures += 1;
      }
      return acc;
    },
    { passes: 0, warnings: 0, errors: 0, blockingFailures: 0 }
  );

  return {
    targetType,
    targetId,
    canPublish: summary.blockingFailures === 0,
    summary,
    checks
  };
}

export function buildShowProjectPublishQc(project: ShowQcRecord): StudioPublishQcResult {
  return finalizeResult("show", project.id, [
    createRequiredTextCheck("show-title", "Show title", project.title, "Show title is required before publish."),
    createRequiredTextCheck("show-slug", "Show slug", project.slug, "Show slug is required before publish."),
    createRequiredTextCheck(
      "show-description",
      "Show description",
      project.description,
      "Show description is required before publish."
    )
  ]);
}

export function buildShowEpisodePublishQc(input: {
  episode: EpisodeQcRecord;
  parentShow: ShowQcRecord | null;
  watchEpisode: WatchEpisodeQcRecord | null;
}): StudioPublishQcResult {
  const checks: StudioPublishQcCheck[] = [
    createRequiredTextCheck("episode-title", "Episode title", input.episode.title, "Episode title is required before publish."),
    createRequiredTextCheck("episode-slug", "Episode slug", input.episode.slug, "Episode slug is required before publish."),
    createRequiredTextCheck(
      "episode-description",
      "Episode description",
      input.episode.synopsis,
      "Episode description is required before publish."
    )
  ];

  if (!input.episode.showProjectId || !input.parentShow) {
    checks.push(
      createCheck({
        code: "episode-parent-show",
        label: "Parent show linkage",
        status: "fail",
        message: "Episode must remain linked to a valid parent show before publish."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "episode-parent-show",
        label: "Parent show linkage",
        status: "pass",
        blocking: false,
        message: "Episode is linked to a valid parent show."
      }),
      createRequiredTextCheck(
        "parent-show-title",
        "Parent show title",
        input.parentShow.title,
        "Parent show title is required before publishing an episode."
      ),
      createRequiredTextCheck(
        "parent-show-slug",
        "Parent show slug",
        input.parentShow.slug,
        "Parent show slug is required before publishing an episode."
      ),
      createRequiredTextCheck(
        "parent-show-description",
        "Parent show description",
        input.parentShow.description,
        "Parent show description is required before publishing an episode."
      )
    );
  }

  const currentAssetUrl = input.watchEpisode?.assetUrl?.trim() ?? "";
  if (currentAssetUrl && currentAssetUrl !== WATCH_PLACEHOLDER_ASSET_URL) {
    checks.push(
      createCheck({
        code: "watch-playback-asset",
        label: "Watch playback asset",
        status: "pass",
        blocking: false,
        message: "Watch episode already has a playback asset."
      })
    );
  } else if (hasValue(WATCH_PLACEHOLDER_ASSET_URL)) {
    checks.push(
      createCheck({
        code: "watch-playback-asset",
        label: "Watch playback asset",
        status: "warn",
        blocking: false,
        message: "Watch will use the configured placeholder playback asset until final media is attached."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "watch-playback-asset",
        label: "Watch playback asset",
        status: "fail",
        message: "Watch requires a playback asset placeholder, but none is configured."
      })
    );
  }

  return finalizeResult("episode", input.episode.id, checks);
}

export async function getShowProjectPublishQc(slugOrId: string) {
  const rows = await prisma.$queryRaw<ShowQcRecord[]>`
    SELECT "id", "title", "slug", "description"
    FROM "ShowProject"
    WHERE "id" = ${slugOrId} OR "slug" = ${slugOrId}
    LIMIT 1
  `;
  const project = rows[0] ?? null;

  return project ? buildShowProjectPublishQc(project) : null;
}

export async function getShowEpisodePublishQc(id: string) {
  const episodeRows = await prisma.$queryRaw<EpisodeQcRow[]>`
    SELECT
      episode."id",
      episode."title",
      episode."slug",
      episode."synopsis",
      episode."showProjectId",
      project."id" AS "projectId",
      project."title" AS "projectTitle",
      project."slug" AS "projectSlug",
      project."description" AS "projectDescription"
    FROM "ShowEpisode" episode
    LEFT JOIN "ShowProject" project ON project."id" = episode."showProjectId"
    WHERE episode."id" = ${id}
    LIMIT 1
  `;
  const row = episodeRows[0] ?? null;

  if (!row) {
    return null;
  }

  const watchEpisodeRows = await prisma.$queryRaw<WatchEpisodeQcRecord[]>`
    SELECT "assetUrl"
    FROM "Episode"
    WHERE "sourceShowEpisodeId" = ${id}
    LIMIT 1
  `;

  return buildShowEpisodePublishQc({
    episode: {
      id: row.id,
      title: row.title,
      slug: row.slug,
      synopsis: row.synopsis,
      showProjectId: row.showProjectId
    },
    parentShow: row.showProjectId
      ? {
          id: row.projectId ?? row.showProjectId,
          title: row.projectTitle,
          slug: row.projectSlug,
          description: row.projectDescription
        }
      : null,
    watchEpisode: watchEpisodeRows[0] ?? null
  });
}
