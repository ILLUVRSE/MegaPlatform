import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import { z } from "zod";
import type { Principal } from "@/lib/authz";
import {
  createShowEpisodeFromTemplate,
  listShowEpisodes,
  type ShowEpisodeTemplateType
} from "@/lib/showEpisodes";
import { createShowExtra, listShowExtras, type ShowExtraType } from "@/lib/showExtras";
import {
  canManageAllShowProjects,
  createShowProject,
  findShowProjectBySlug,
  getShowProjectAccessForUser,
  type ShowProjectFormat
} from "@/lib/showProjects";

export const SHOW_TEMPLATE_VISIBILITIES = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;

export const createShowTemplateSchema = z.object({
  projectSlug: z.string().trim().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).nullable().optional(),
  visibility: z.enum(SHOW_TEMPLATE_VISIBILITIES).default("PRIVATE")
});

export const instantiateShowTemplateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional()
});

const serializedShowTemplateDefaultsSchema = z.object({
  version: z.literal(1),
  project: z.object({
    format: z.enum(["SERIES", "MOVIE"]),
    description: z.string().nullable(),
    posterImageUrl: z.string().nullable(),
    bannerImageUrl: z.string().nullable()
  }),
  episodes: z.array(
    z.object({
      title: z.string(),
      synopsis: z.string().nullable(),
      seasonNumber: z.number().int().nullable(),
      episodeNumber: z.number().int().nullable(),
      runtimeSeconds: z.number().int().nullable(),
      templateType: z.enum(["STANDARD_EPISODE", "COLD_OPEN_EPISODE", "MOVIE_CHAPTER"])
    })
  ),
  extras: z.array(
    z.object({
      type: z.enum(["BEHIND_THE_SCENES", "COMMENTARY", "BONUS_CLIP", "TRAILER"]),
      title: z.string(),
      description: z.string().nullable(),
      assetUrl: z.string().url(),
      runtimeSeconds: z.number().int().nullable()
    })
  )
});

export type ShowTemplateRecord = {
  id: string;
  title: string;
  description: string | null;
  templateType: ShowProjectFormat;
  createdById: string;
  createdByName: string | null;
  sourceShowProjectId: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  serializedDefaults: z.infer<typeof serializedShowTemplateDefaultsSchema>;
  createdAt: Date;
  updatedAt: Date;
};

function canReadShowTemplate(principal: Principal, template: Pick<ShowTemplateRecord, "createdById" | "visibility">) {
  return template.visibility !== "PRIVATE" || template.createdById === principal.userId || canManageAllShowProjects(principal);
}

function buildSerializedDefaults(input: {
  format: ShowProjectFormat;
  description: string | null;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
  episodes: Awaited<ReturnType<typeof listShowEpisodes>>;
  extras: Awaited<ReturnType<typeof listShowExtras>>;
}) {
  return {
    version: 1 as const,
    project: {
      format: input.format,
      description: input.description,
      posterImageUrl: input.posterImageUrl,
      bannerImageUrl: input.bannerImageUrl
    },
    episodes: input.episodes.map((episode) => ({
      title: episode.title,
      synopsis: episode.synopsis,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      runtimeSeconds: episode.runtimeSeconds,
      templateType: episode.templateType
    })),
    extras: input.extras.map((extra) => ({
      type: extra.type,
      title: extra.title,
      description: extra.description,
      assetUrl: extra.assetUrl,
      runtimeSeconds: extra.runtimeSeconds
    }))
  };
}

function selectShowTemplateFields(alias?: string) {
  const table = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`
    ${table}"id",
    ${table}"title",
    ${table}"description",
    ${table}"templateType"::text AS "templateType",
    ${table}"createdById",
    ${table}"sourceShowProjectId",
    ${table}"visibility"::text AS "visibility",
    ${table}"serializedDefaults",
    ${table}"createdAt",
    ${table}"updatedAt"
  `;
}

function mapShowTemplate(template: {
  id: string;
  title: string;
  description: string | null;
  templateType: ShowProjectFormat;
  createdById: string;
  sourceShowProjectId: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  serializedDefaults: unknown;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { name: string | null };
}): ShowTemplateRecord {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    templateType: template.templateType,
    createdById: template.createdById,
    createdByName: template.createdBy.name,
    sourceShowProjectId: template.sourceShowProjectId,
    visibility: template.visibility,
    serializedDefaults: serializedShowTemplateDefaultsSchema.parse(template.serializedDefaults),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt
  };
}

export async function listShowTemplates(
  principal: Principal,
  input?: {
    templateType?: ShowProjectFormat;
    mineOnly?: boolean;
  }
) {
  const clauses: Prisma.Sql[] = [];

  if (input?.templateType) {
    clauses.push(Prisma.sql`template."templateType" = ${input.templateType}::"ShowProjectFormat"`);
  }
  if (input?.mineOnly) {
    clauses.push(Prisma.sql`template."createdById" = ${principal.userId}`);
  } else if (!canManageAllShowProjects(principal)) {
    clauses.push(
      Prisma.sql`(template."visibility" <> 'PRIVATE'::"ContentVisibility" OR template."createdById" = ${principal.userId})`
    );
  }

  const whereClause = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.empty;

  const templates = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      templateType: ShowProjectFormat;
      createdById: string;
      sourceShowProjectId: string | null;
      visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
      serializedDefaults: unknown;
      createdAt: Date;
      updatedAt: Date;
      createdByName: string | null;
    }>
  >`
    SELECT
      ${selectShowTemplateFields("template")},
      creator."name" AS "createdByName"
    FROM "ShowTemplate" template
    INNER JOIN "User" creator ON creator."id" = template."createdById"
    ${whereClause}
    ORDER BY template."updatedAt" DESC, template."createdAt" DESC
    LIMIT 100
  `;

  return templates.map((template) =>
    mapShowTemplate({
      ...template,
      createdBy: { name: template.createdByName }
    })
  );
}

export async function listShowTemplateSummaries(principal: Principal) {
  const templates = await listShowTemplates(principal);
  return templates.map((template) => ({
    ...template,
    episodeCount: template.serializedDefaults.episodes.length,
    extraCount: template.serializedDefaults.extras.length
  }));
}

export async function findShowTemplateById(id: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      templateType: ShowProjectFormat;
      createdById: string;
      sourceShowProjectId: string | null;
      visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
      serializedDefaults: unknown;
      createdAt: Date;
      updatedAt: Date;
      createdByName: string | null;
    }>
  >`
    SELECT
      ${selectShowTemplateFields("template")},
      creator."name" AS "createdByName"
    FROM "ShowTemplate" template
    INNER JOIN "User" creator ON creator."id" = template."createdById"
    WHERE template."id" = ${id}
    LIMIT 1
  `;

  const template = rows[0];
  return template
    ? mapShowTemplate({
        ...template,
        createdBy: { name: template.createdByName }
      })
    : null;
}

export async function createShowTemplateFromProject(
  principal: Principal,
  input: z.infer<typeof createShowTemplateSchema>
) {
  const project = await findShowProjectBySlug(input.projectSlug);
  if (!project) {
    throw new Error("Show project not found.");
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.editProject) {
    throw new Error("Forbidden");
  }

  const [episodes, extras] = await Promise.all([listShowEpisodes(project.id), listShowExtras(project.id)]);
  const serializedDefaults = buildSerializedDefaults({
    format: project.format,
    description: project.description,
    posterImageUrl: project.posterImageUrl,
    bannerImageUrl: project.bannerImageUrl,
    episodes,
    extras
  });

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      templateType: ShowProjectFormat;
      createdById: string;
      sourceShowProjectId: string | null;
      visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
      serializedDefaults: unknown;
      createdAt: Date;
      updatedAt: Date;
      createdByName: string | null;
    }>
  >`
    INSERT INTO "ShowTemplate" (
      "id",
      "title",
      "description",
      "templateType",
      "createdById",
      "sourceShowProjectId",
      "visibility",
      "serializedDefaults",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.title},
      ${input.description ?? project.description ?? null},
      ${project.format}::"ShowProjectFormat",
      ${principal.userId},
      ${project.id},
      ${input.visibility}::"ContentVisibility",
      ${JSON.stringify(serializedDefaults)}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING
      ${selectShowTemplateFields()},
      (
        SELECT "name"
        FROM "User"
        WHERE "id" = ${principal.userId}
        LIMIT 1
      ) AS "createdByName"
  `;

  const template = rows[0];
  if (!template) {
    throw new Error("Unable to save template.");
  }

  return mapShowTemplate({
    ...template,
    createdBy: { name: template.createdByName }
  });
}

export async function instantiateShowProjectFromTemplate(
  principal: Principal,
  templateId: string,
  input?: z.infer<typeof instantiateShowTemplateSchema>
) {
  const template = await findShowTemplateById(templateId);
  if (!template) {
    throw new Error("Template not found.");
  }
  if (!canReadShowTemplate(principal, template)) {
    throw new Error("Forbidden");
  }

  const defaults = template.serializedDefaults;
  const project = await createShowProject({
    ownerId: principal.userId,
    title: input?.title?.trim() || template.title,
    description: defaults.project.description,
    format: defaults.project.format,
    posterImageUrl: defaults.project.posterImageUrl,
    bannerImageUrl: defaults.project.bannerImageUrl
  });

  if (!project) {
    throw new Error("Unable to create show project from template.");
  }

  for (const episode of defaults.episodes) {
    await createShowEpisodeFromTemplate({
      project,
      title: episode.title,
      synopsis: episode.synopsis,
      seasonNumber: defaults.project.format === "SERIES" ? episode.seasonNumber : null,
      episodeNumber: defaults.project.format === "SERIES" ? episode.episodeNumber : null,
      runtimeSeconds: episode.runtimeSeconds,
      templateType: episode.templateType as ShowEpisodeTemplateType
    });
  }

  for (const extra of defaults.extras) {
    await createShowExtra({
      project,
      type: extra.type as ShowExtraType,
      title: extra.title,
      description: extra.description,
      assetUrl: extra.assetUrl,
      runtimeSeconds: extra.runtimeSeconds,
      status: "DRAFT"
    });
  }

  return {
    project,
    template
  };
}
