import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import { z } from "zod";
import type { PremiereType } from "@/lib/releaseScheduling";
import type { ShowProjectFormat, ShowProjectRecord } from "@/lib/showProjects";

export const SHOW_EPISODE_STATUSES = ["DRAFT", "READY", "PUBLISHED"] as const;
export const SHOW_EPISODE_TEMPLATE_TYPES = [
  "STANDARD_EPISODE",
  "COLD_OPEN_EPISODE",
  "MOVIE_CHAPTER"
] as const;

export type ShowEpisodeStatus = (typeof SHOW_EPISODE_STATUSES)[number];
export type ShowEpisodeTemplateType = (typeof SHOW_EPISODE_TEMPLATE_TYPES)[number];

export type ShowEpisodeRecord = {
  id: string;
  showProjectId: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  slug: string;
  synopsis: string | null;
  runtimeSeconds: number | null;
  status: ShowEpisodeStatus;
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
  templateType: ShowEpisodeTemplateType;
  createdAt: Date;
  updatedAt: Date;
};

export const createShowEpisodeSchema = z.object({
  templateType: z.enum(SHOW_EPISODE_TEMPLATE_TYPES),
  seasonNumber: z.number().int().min(1).max(999).nullable().optional(),
  episodeNumber: z.number().int().min(1).max(9999).nullable().optional()
});

export const updateShowEpisodeSchema = z
  .object({
    seasonNumber: z.number().int().min(1).max(999).nullable().optional(),
    episodeNumber: z.number().int().min(1).max(9999).nullable().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    synopsis: z.string().trim().max(4000).nullable().optional(),
    runtimeSeconds: z.number().int().min(1).max(60 * 60 * 8).nullable().optional(),
    status: z.enum(SHOW_EPISODE_STATUSES).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export function normalizeShowEpisodeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function listShowEpisodes(showProjectId: string) {
  return prisma.$queryRaw<ShowEpisodeRecord[]>`
    SELECT
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
      "templateType"::text AS "templateType",
      "createdAt",
      "updatedAt"
    FROM "ShowEpisode"
    WHERE "showProjectId" = ${showProjectId}
    ORDER BY
      COALESCE("seasonNumber", 999999) ASC,
      COALESCE("episodeNumber", 999999) ASC,
      "createdAt" ASC
  `;
}

export async function findShowEpisodeById(id: string) {
  const rows = await prisma.$queryRaw<(ShowEpisodeRecord & { ownerId: string })[]>`
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
      episode."templateType"::text AS "templateType",
      episode."createdAt",
      episode."updatedAt",
      project."ownerId"
    FROM "ShowEpisode" episode
    INNER JOIN "ShowProject" project ON project."id" = episode."showProjectId"
    WHERE episode."id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findShowEpisodeByProjectAndSlug(showProjectId: string, slug: string) {
  const rows = await prisma.$queryRaw<(ShowEpisodeRecord & { ownerId: string })[]>`
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
      episode."templateType"::text AS "templateType",
      episode."createdAt",
      episode."updatedAt",
      project."ownerId"
    FROM "ShowEpisode" episode
    INNER JOIN "ShowProject" project ON project."id" = episode."showProjectId"
    WHERE episode."showProjectId" = ${showProjectId} AND episode."slug" = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

type TemplateDefaults = {
  titlePrefix: string;
  synopsis: string;
};

function getTemplateDefaults(templateType: ShowEpisodeTemplateType, format: ShowProjectFormat): TemplateDefaults {
  switch (templateType) {
    case "COLD_OPEN_EPISODE":
      return {
        titlePrefix: "Cold Open",
        synopsis:
          "Cold open structure notes: hook the audience immediately, establish the inciting beat, and hand off cleanly into the main episode."
      };
    case "MOVIE_CHAPTER":
      return {
        titlePrefix: format === "MOVIE" ? "Chapter" : "Movie Chapter",
        synopsis:
          "Movie chapter structure notes: define the chapter objective, escalate character tension, and end on a turn that propels the next sequence."
      };
    case "STANDARD_EPISODE":
    default:
      return {
        titlePrefix: "Episode",
        synopsis:
          "Episode structure notes: open with the central conflict, advance the A/B story beats, and close with a clear handoff to the next episode."
      };
  }
}

async function buildUniqueShowEpisodeSlug(showProjectId: string, title: string) {
  const baseSlug = normalizeShowEpisodeSlug(title) || "episode";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ShowEpisode"
      WHERE "showProjectId" = ${showProjectId} AND "slug" = ${slug}
      LIMIT 1
    `;
    if (!existing[0]) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

function buildPlaceholderTitle(defaults: TemplateDefaults, ordinal: number) {
  return `${defaults.titlePrefix} ${ordinal}`;
}

export async function createShowEpisode(input: {
  project: ShowProjectRecord;
  templateType: ShowEpisodeTemplateType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}) {
  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "ShowEpisode"
    WHERE "showProjectId" = ${input.project.id}
  `;
  const ordinal = Number(countRows[0]?.count ?? 0n) + 1;
  const defaults = getTemplateDefaults(input.templateType, input.project.format);
  const title = buildPlaceholderTitle(defaults, ordinal);
  const slug = await buildUniqueShowEpisodeSlug(input.project.id, title);

  const seasonNumber =
    input.project.format === "SERIES"
      ? input.seasonNumber ?? (input.templateType === "MOVIE_CHAPTER" ? null : 1)
      : null;
  const episodeNumber =
    input.project.format === "SERIES" && input.templateType !== "MOVIE_CHAPTER"
      ? input.episodeNumber ?? ordinal
      : null;

  const rows = await prisma.$queryRaw<ShowEpisodeRecord[]>`
    INSERT INTO "ShowEpisode" (
      "id",
      "showProjectId",
      "seasonNumber",
      "episodeNumber",
      "title",
      "slug",
      "synopsis",
      "runtimeSeconds",
      "status",
      "publishedAt",
      "visibility",
      "allowedRegions",
      "requiresEntitlement",
      "premiereType",
      "releaseAt",
      "isPremiereEnabled",
      "premiereStartsAt",
      "premiereEndsAt",
      "chatEnabled",
      "templateType",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.project.id},
      ${seasonNumber},
      ${episodeNumber},
      ${title},
      ${slug},
      ${defaults.synopsis},
      NULL,
      'DRAFT'::"ShowEpisodeStatus",
      NULL,
      'PUBLIC'::"ContentVisibility",
      ARRAY[]::TEXT[],
      false,
      'IMMEDIATE'::"PremiereType",
      NULL,
      false,
      NULL,
      NULL,
      false,
      ${input.templateType}::"ShowEpisodeTemplateType",
      NOW(),
      NOW()
    )
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
      "templateType"::text AS "templateType",
      "createdAt",
      "updatedAt"
  `;

  return rows[0] ?? null;
}

export async function updateShowEpisode(
  current: ShowEpisodeRecord,
  input: z.infer<typeof updateShowEpisodeSchema>
) {
  const nextTitle = input.title ?? current.title;
  const nextSlug =
    input.title && input.title !== current.title
      ? await buildUniqueShowEpisodeSlug(current.showProjectId, nextTitle)
      : current.slug;

  const assignments: Prisma.Sql[] = [];

  if (input.seasonNumber !== undefined) {
    assignments.push(Prisma.sql`"seasonNumber" = ${input.seasonNumber}`);
  }
  if (input.episodeNumber !== undefined) {
    assignments.push(Prisma.sql`"episodeNumber" = ${input.episodeNumber}`);
  }
  if (input.title !== undefined) {
    assignments.push(Prisma.sql`"title" = ${nextTitle}`);
    assignments.push(Prisma.sql`"slug" = ${nextSlug}`);
  }
  if (input.synopsis !== undefined) {
    assignments.push(Prisma.sql`"synopsis" = ${input.synopsis}`);
  }
  if (input.runtimeSeconds !== undefined) {
    assignments.push(Prisma.sql`"runtimeSeconds" = ${input.runtimeSeconds}`);
  }
  if (input.status !== undefined) {
    assignments.push(Prisma.sql`"status" = ${input.status}::"ShowEpisodeStatus"`);
  }

  assignments.push(Prisma.sql`"updatedAt" = NOW()`);

  const rows = await prisma.$queryRaw<ShowEpisodeRecord[]>`
    UPDATE "ShowEpisode"
    SET ${Prisma.join(assignments, ", ")}
    WHERE "id" = ${current.id}
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
      "premiereType"::text AS "premiereType",
      "releaseAt",
      "isPremiereEnabled",
      "premiereStartsAt",
      "premiereEndsAt",
      "chatEnabled",
      "templateType"::text AS "templateType",
      "createdAt",
      "updatedAt"
  `;

  return rows[0] ?? null;
}
