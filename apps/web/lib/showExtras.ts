import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import { z } from "zod";
import { evaluateReleaseSchedule, type PremiereType } from "@/lib/releaseScheduling";
import type { Principal } from "@/lib/authz";
import { canManageAllShowProjects, type ShowProjectRecord } from "@/lib/showProjects";

export const SHOW_EXTRA_TYPES = ["BEHIND_THE_SCENES", "COMMENTARY", "BONUS_CLIP", "TRAILER"] as const;
export const SHOW_EXTRA_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ShowExtraType = (typeof SHOW_EXTRA_TYPES)[number];
export type ShowExtraStatus = (typeof SHOW_EXTRA_STATUSES)[number];

export type ShowExtraRecord = {
  id: string;
  showProjectId: string;
  type: ShowExtraType;
  title: string;
  description: string | null;
  assetUrl: string;
  runtimeSeconds: number | null;
  status: ShowExtraStatus;
  publishedAt: Date | null;
  premiereType: PremiereType;
  releaseAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShowExtraWithOwner = ShowExtraRecord & {
  ownerId: string;
};

export const createShowExtraSchema = z.object({
  type: z.enum(SHOW_EXTRA_TYPES),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).nullable().optional(),
  assetUrl: z.string().trim().url().max(2000),
  runtimeSeconds: z.number().int().min(1).max(60 * 60 * 8).nullable().optional(),
  status: z.enum(SHOW_EXTRA_STATUSES).optional(),
  premiereType: z.enum(["IMMEDIATE", "SCHEDULED"] as const).optional(),
  releaseAt: z.string().datetime().nullable().optional()
});

export const updateShowExtraSchema = z
  .object({
    type: z.enum(SHOW_EXTRA_TYPES).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    assetUrl: z.string().trim().url().max(2000).optional(),
    runtimeSeconds: z.number().int().min(1).max(60 * 60 * 8).nullable().optional(),
    status: z.enum(SHOW_EXTRA_STATUSES).optional(),
    premiereType: z.enum(["IMMEDIATE", "SCHEDULED"] as const).optional(),
    releaseAt: z.string().datetime().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

function selectShowExtraFields(alias?: string) {
  const table = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`
    ${table}"id",
    ${table}"showProjectId",
    ${table}"type"::text AS "type",
    ${table}"title",
    ${table}"description",
    ${table}"assetUrl",
    ${table}"runtimeSeconds",
    ${table}"status"::text AS "status",
    ${table}"publishedAt",
    ${table}"premiereType"::text AS "premiereType",
    ${table}"releaseAt",
    ${table}"createdAt",
    ${table}"updatedAt"
  `;
}

export function canManageShowExtra(principal: Principal, project: ShowProjectRecord) {
  return canManageAllShowProjects(principal) || project.ownerId === principal.userId;
}

export async function listShowExtras(showProjectId: string) {
  return prisma.$queryRaw<ShowExtraRecord[]>`
    SELECT ${selectShowExtraFields()}
    FROM "ShowExtra"
    WHERE "showProjectId" = ${showProjectId}
    ORDER BY "createdAt" DESC
  `;
}

export async function findShowExtraById(id: string) {
  const rows = await prisma.$queryRaw<ShowExtraWithOwner[]>`
    SELECT
      ${selectShowExtraFields("extra")},
      project."ownerId"
    FROM "ShowExtra" extra
    INNER JOIN "ShowProject" project ON project."id" = extra."showProjectId"
    WHERE extra."id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listPublishedShowExtrasForWatch(showProjectId: string | null, now = new Date()) {
  if (!showProjectId) {
    return [] as ShowExtraRecord[];
  }

  const rows = await prisma.$queryRaw<ShowExtraRecord[]>`
    SELECT ${selectShowExtraFields()}
    FROM "ShowExtra"
    WHERE "showProjectId" = ${showProjectId}
      AND "status" = 'PUBLISHED'::"ShowExtraStatus"
    ORDER BY
      CASE "type"
        WHEN 'TRAILER'::"ShowExtraType" THEN 0
        WHEN 'BEHIND_THE_SCENES'::"ShowExtraType" THEN 1
        WHEN 'COMMENTARY'::"ShowExtraType" THEN 2
        ELSE 3
      END ASC,
      "createdAt" DESC
  `;

  return rows.filter((extra) => evaluateReleaseSchedule(extra, now).isReleased);
}

export async function listPublishedShowExtrasForWatchByProjectSlug(showProjectSlug: string, now = new Date()) {
  const rows = await prisma.$queryRaw<ShowExtraRecord[]>`
    SELECT ${selectShowExtraFields("extra")}
    FROM "ShowExtra" extra
    INNER JOIN "ShowProject" project ON project."id" = extra."showProjectId"
    WHERE project."slug" = ${showProjectSlug}
      AND extra."status" = 'PUBLISHED'::"ShowExtraStatus"
    ORDER BY
      CASE extra."type"
        WHEN 'TRAILER'::"ShowExtraType" THEN 0
        WHEN 'BEHIND_THE_SCENES'::"ShowExtraType" THEN 1
        WHEN 'COMMENTARY'::"ShowExtraType" THEN 2
        ELSE 3
      END ASC,
      extra."createdAt" DESC
  `;

  return rows.filter((extra) => evaluateReleaseSchedule(extra, now).isReleased);
}

export async function createShowExtra(input: {
  project: ShowProjectRecord;
  type: ShowExtraType;
  title: string;
  description?: string | null;
  assetUrl: string;
  runtimeSeconds?: number | null;
  status?: ShowExtraStatus;
  premiereType?: PremiereType;
  releaseAt?: Date | null;
}) {
  const status = input.status ?? "DRAFT";
  const premiereType = input.premiereType ?? "IMMEDIATE";
  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const rows = await prisma.$queryRaw<ShowExtraRecord[]>`
    INSERT INTO "ShowExtra" (
      "id",
      "showProjectId",
      "type",
      "title",
      "description",
      "assetUrl",
      "runtimeSeconds",
      "status",
      "publishedAt",
      "premiereType",
      "releaseAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.project.id},
      ${input.type}::"ShowExtraType",
      ${input.title},
      ${input.description ?? null},
      ${input.assetUrl},
      ${input.runtimeSeconds ?? null},
      ${status}::"ShowExtraStatus",
      ${publishedAt},
      ${premiereType}::"PremiereType",
      ${input.releaseAt ?? null},
      NOW(),
      NOW()
    )
    RETURNING ${selectShowExtraFields()}
  `;

  return rows[0] ?? null;
}

export async function updateShowExtra(
  current: ShowExtraRecord,
  input: {
    type?: ShowExtraType;
    title?: string;
    description?: string | null;
    assetUrl?: string;
    runtimeSeconds?: number | null;
    status?: ShowExtraStatus;
    premiereType?: PremiereType;
    releaseAt?: Date | null;
  }
) {
  const assignments: Prisma.Sql[] = [];

  if (input.type) {
    assignments.push(Prisma.sql`"type" = ${input.type}::"ShowExtraType"`);
  }
  if (input.title !== undefined) {
    assignments.push(Prisma.sql`"title" = ${input.title}`);
  }
  if (input.description !== undefined) {
    assignments.push(Prisma.sql`"description" = ${input.description}`);
  }
  if (input.assetUrl !== undefined) {
    assignments.push(Prisma.sql`"assetUrl" = ${input.assetUrl}`);
  }
  if (input.runtimeSeconds !== undefined) {
    assignments.push(Prisma.sql`"runtimeSeconds" = ${input.runtimeSeconds}`);
  }
  if (input.status) {
    assignments.push(Prisma.sql`"status" = ${input.status}::"ShowExtraStatus"`);
    if (input.status === "PUBLISHED" && !current.publishedAt) {
      assignments.push(Prisma.sql`"publishedAt" = NOW()`);
    }
    if (input.status === "DRAFT") {
      assignments.push(Prisma.sql`"publishedAt" = NULL`);
    }
  }
  if (input.premiereType) {
    assignments.push(Prisma.sql`"premiereType" = ${input.premiereType}::"PremiereType"`);
  }
  if (input.releaseAt !== undefined) {
    assignments.push(Prisma.sql`"releaseAt" = ${input.releaseAt}`);
  }

  assignments.push(Prisma.sql`"updatedAt" = NOW()`);

  const rows = await prisma.$queryRaw<ShowExtraRecord[]>`
    UPDATE "ShowExtra"
    SET ${Prisma.join(assignments, ", ")}
    WHERE "id" = ${current.id}
    RETURNING ${selectShowExtraFields()}
  `;

  return rows[0] ?? null;
}
