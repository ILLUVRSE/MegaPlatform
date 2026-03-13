import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import { z } from "zod";

export const INTERACTIVE_EXTRA_TYPES = ["POLL", "CALLOUT"] as const;
export const INTERACTIVE_EXTRA_PUBLISH_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type InteractiveExtraType = (typeof INTERACTIVE_EXTRA_TYPES)[number];
export type InteractiveExtraPublishStatus = (typeof INTERACTIVE_EXTRA_PUBLISH_STATUSES)[number];

const pollOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120)
});

const calloutPayloadSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
  ctaUrl: z.string().trim().url().max(2000).nullable().optional()
});

const pollPayloadSchema = z.object({
  prompt: z.string().trim().max(240).nullable().optional(),
  options: z.array(pollOptionSchema).min(2).max(6)
});

const interactiveExtraPayloadSchema = z.union([pollPayloadSchema, calloutPayloadSchema]);

export type InteractiveExtraRecord = {
  id: string;
  showId: string | null;
  episodeId: string | null;
  type: InteractiveExtraType;
  title: string;
  payload: Record<string, unknown>;
  publishStatus: InteractiveExtraPublishStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type InteractiveExtraWithOwner = InteractiveExtraRecord & {
  showProjectId: string;
  ownerId: string;
};

export const createInteractiveExtraSchema = z
  .object({
    showId: z.string().trim().min(1).nullable().optional(),
    episodeId: z.string().trim().min(1).nullable().optional(),
    type: z.enum(INTERACTIVE_EXTRA_TYPES),
    title: z.string().trim().min(1).max(160),
    payload: interactiveExtraPayloadSchema,
    publishStatus: z.enum(INTERACTIVE_EXTRA_PUBLISH_STATUSES).optional()
  });

export const updateInteractiveExtraSchema = z
  .object({
    type: z.enum(INTERACTIVE_EXTRA_TYPES).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    payload: interactiveExtraPayloadSchema.optional(),
    publishStatus: z.enum(INTERACTIVE_EXTRA_PUBLISH_STATUSES).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

function selectInteractiveExtraFields(alias?: string) {
  const table = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`
    ${table}"id",
    ${table}"showId",
    ${table}"episodeId",
    ${table}"type"::text AS "type",
    ${table}"title",
    ${table}"payload",
    ${table}"publishStatus"::text AS "publishStatus",
    ${table}"createdAt",
    ${table}"updatedAt"
  `;
}

function normalizePayload(type: InteractiveExtraType, payload: unknown) {
  if (type === "POLL") {
    const parsed = pollPayloadSchema.parse(payload);
    return {
      prompt: parsed.prompt?.trim() || null,
      options: parsed.options.map((option, index) => ({
        id: option.id.trim() || `option-${index + 1}`,
        label: option.label.trim()
      }))
    } satisfies Record<string, unknown>;
  }

  const parsed = calloutPayloadSchema.parse(payload);
  return {
    body: parsed.body.trim(),
    ctaLabel: parsed.ctaLabel?.trim() || null,
    ctaUrl: parsed.ctaUrl?.trim() || null
  } satisfies Record<string, unknown>;
}

export async function listInteractiveExtrasForShow(showId: string) {
  return prisma.$queryRaw<InteractiveExtraRecord[]>`
    SELECT ${selectInteractiveExtraFields()}
    FROM "InteractiveExtra"
    WHERE "showId" = ${showId}
    ORDER BY "updatedAt" DESC, "createdAt" DESC
  `;
}

export async function listInteractiveExtrasForEpisode(episodeId: string) {
  return prisma.$queryRaw<InteractiveExtraRecord[]>`
    SELECT ${selectInteractiveExtraFields()}
    FROM "InteractiveExtra"
    WHERE "episodeId" = ${episodeId}
    ORDER BY "updatedAt" DESC, "createdAt" DESC
  `;
}

export async function listPublishedInteractiveExtrasForShowByProjectSlug(showSlug: string) {
  return prisma.$queryRaw<InteractiveExtraRecord[]>`
    SELECT ${selectInteractiveExtraFields("extra")}
    FROM "InteractiveExtra" extra
    INNER JOIN "ShowProject" project ON project."id" = extra."showId"
    WHERE project."slug" = ${showSlug}
      AND extra."publishStatus" = 'PUBLISHED'::"InteractiveExtraPublishStatus"
    ORDER BY extra."updatedAt" DESC, extra."createdAt" DESC
  `;
}

export async function listPublishedInteractiveExtrasForEpisode(studioEpisodeId: string | null) {
  if (!studioEpisodeId) {
    return [] as InteractiveExtraRecord[];
  }

  return prisma.$queryRaw<InteractiveExtraRecord[]>`
    SELECT ${selectInteractiveExtraFields()}
    FROM "InteractiveExtra"
    WHERE "episodeId" = ${studioEpisodeId}
      AND "publishStatus" = 'PUBLISHED'::"InteractiveExtraPublishStatus"
    ORDER BY "updatedAt" DESC, "createdAt" DESC
  `;
}

export async function findInteractiveExtraById(id: string) {
  const rows = await prisma.$queryRaw<InteractiveExtraWithOwner[]>`
    SELECT
      ${selectInteractiveExtraFields("extra")},
      COALESCE(extra."showId", episode."showProjectId") AS "showProjectId",
      project."ownerId"
    FROM "InteractiveExtra" extra
    LEFT JOIN "ShowEpisode" episode ON episode."id" = extra."episodeId"
    LEFT JOIN "ShowProject" project ON project."id" = COALESCE(extra."showId", episode."showProjectId")
    WHERE extra."id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createInteractiveExtra(input: {
  showId?: string | null;
  episodeId?: string | null;
  type: InteractiveExtraType;
  title: string;
  payload: unknown;
  publishStatus?: InteractiveExtraPublishStatus;
}) {
  const normalizedPayload = normalizePayload(input.type, input.payload);
  const publishStatus = input.publishStatus ?? "DRAFT";

  const rows = await prisma.$queryRaw<InteractiveExtraRecord[]>`
    INSERT INTO "InteractiveExtra" (
      "id",
      "showId",
      "episodeId",
      "type",
      "title",
      "payload",
      "publishStatus",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.showId ?? null},
      ${input.episodeId ?? null},
      ${input.type}::"InteractiveExtraType",
      ${input.title},
      ${normalizedPayload}::jsonb,
      ${publishStatus}::"InteractiveExtraPublishStatus",
      NOW(),
      NOW()
    )
    RETURNING ${selectInteractiveExtraFields()}
  `;

  return rows[0] ?? null;
}

export async function updateInteractiveExtra(
  current: InteractiveExtraRecord,
  input: {
    type?: InteractiveExtraType;
    title?: string;
    payload?: unknown;
    publishStatus?: InteractiveExtraPublishStatus;
  }
) {
  const assignments: Prisma.Sql[] = [];
  const nextType = input.type ?? current.type;

  if (input.type) {
    assignments.push(Prisma.sql`"type" = ${input.type}::"InteractiveExtraType"`);
  }
  if (input.title !== undefined) {
    assignments.push(Prisma.sql`"title" = ${input.title}`);
  }
  if (input.payload !== undefined) {
    assignments.push(Prisma.sql`"payload" = ${normalizePayload(nextType, input.payload)}::jsonb`);
  }
  if (input.publishStatus) {
    assignments.push(
      Prisma.sql`"publishStatus" = ${input.publishStatus}::"InteractiveExtraPublishStatus"`
    );
  }
  assignments.push(Prisma.sql`"updatedAt" = NOW()`);

  const rows = await prisma.$queryRaw<InteractiveExtraRecord[]>`
    UPDATE "InteractiveExtra"
    SET ${Prisma.join(assignments, ", ")}
    WHERE "id" = ${current.id}
    RETURNING ${selectInteractiveExtraFields()}
  `;

  return rows[0] ?? null;
}
