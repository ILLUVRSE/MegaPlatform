import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import { z } from "zod";
import type { ShowEpisodeRecord } from "@/lib/showEpisodes";

export type ShowSceneRecord = {
  id: string;
  showEpisodeId: string;
  sceneNumber: number;
  title: string;
  scriptText: string;
  startIntentSeconds: number | null;
  endIntentSeconds: number | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(24);

export const createShowSceneSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  scriptText: z.string().max(20000).default(""),
  startIntentSeconds: z.number().int().min(0).max(60 * 60 * 12).nullable().optional(),
  endIntentSeconds: z.number().int().min(0).max(60 * 60 * 12).nullable().optional(),
  tags: tagsSchema.nullable().optional()
});

export const updateShowSceneSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    scriptText: z.string().max(20000).optional(),
    startIntentSeconds: z.number().int().min(0).max(60 * 60 * 12).nullable().optional(),
    endIntentSeconds: z.number().int().min(0).max(60 * 60 * 12).nullable().optional(),
    tags: tagsSchema.nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  })
  .refine(
    (value) =>
      value.startIntentSeconds === undefined ||
      value.endIntentSeconds === undefined ||
      value.startIntentSeconds === null ||
      value.endIntentSeconds === null ||
      value.endIntentSeconds >= value.startIntentSeconds,
    {
      message: "End intent must be greater than or equal to start intent",
      path: ["endIntentSeconds"]
    }
  );

export const reorderShowScenesSchema = z.object({
  sceneIds: z.array(z.string().min(1)).min(1).max(500)
});

function normalizeSceneTags(tags: string[] | null | undefined) {
  if (tags === undefined) {
    return undefined;
  }
  if (tags === null) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 24)
    )
  );

  return normalized.length > 0 ? normalized : null;
}

function mapShowSceneRecord(row: {
  id: string;
  showEpisodeId: string;
  sceneNumber: number;
  title: string;
  scriptText: string;
  startIntentSeconds: number | null;
  endIntentSeconds: number | null;
  tags: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags.filter((value): value is string => typeof value === "string") : null
  } satisfies ShowSceneRecord;
}

export async function listShowScenes(showEpisodeId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      showEpisodeId: string;
      sceneNumber: number;
      title: string;
      scriptText: string;
      startIntentSeconds: number | null;
      endIntentSeconds: number | null;
      tags: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT
      "id",
      "showEpisodeId",
      "sceneNumber",
      "title",
      "scriptText",
      "startIntentSeconds",
      "endIntentSeconds",
      "tags",
      "createdAt",
      "updatedAt"
    FROM "ShowScene"
    WHERE "showEpisodeId" = ${showEpisodeId}
    ORDER BY "sceneNumber" ASC, "createdAt" ASC
  `;

  return rows.map(mapShowSceneRecord);
}

export async function findShowSceneById(id: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      showEpisodeId: string;
      sceneNumber: number;
      title: string;
      scriptText: string;
      startIntentSeconds: number | null;
      endIntentSeconds: number | null;
      tags: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
      ownerId: string;
    }>
  >`
    SELECT
      scene."id",
      scene."showEpisodeId",
      scene."sceneNumber",
      scene."title",
      scene."scriptText",
      scene."startIntentSeconds",
      scene."endIntentSeconds",
      scene."tags",
      scene."createdAt",
      scene."updatedAt",
      project."ownerId"
    FROM "ShowScene" scene
    INNER JOIN "ShowEpisode" episode ON episode."id" = scene."showEpisodeId"
    INNER JOIN "ShowProject" project ON project."id" = episode."showProjectId"
    WHERE scene."id" = ${id}
    LIMIT 1
  `;

  const row = rows[0];
  return row ? { ...mapShowSceneRecord(row), ownerId: row.ownerId } : null;
}

export async function createShowScene(
  episode: ShowEpisodeRecord,
  input: z.infer<typeof createShowSceneSchema>
) {
  const normalizedTags = normalizeSceneTags(input.tags);
  const rangeStart = input.startIntentSeconds ?? null;
  const rangeEnd = input.endIntentSeconds ?? null;

  if (rangeStart !== null && rangeEnd !== null && rangeEnd < rangeStart) {
    throw new Error("End intent must be greater than or equal to start intent");
  }

  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "ShowScene"
    WHERE "showEpisodeId" = ${episode.id}
  `;
  const nextSceneNumber = Number(countRows[0]?.count ?? 0n) + 1;
  const title = input.title?.trim() || `Scene ${nextSceneNumber}`;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      showEpisodeId: string;
      sceneNumber: number;
      title: string;
      scriptText: string;
      startIntentSeconds: number | null;
      endIntentSeconds: number | null;
      tags: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    INSERT INTO "ShowScene" (
      "id",
      "showEpisodeId",
      "sceneNumber",
      "title",
      "scriptText",
      "startIntentSeconds",
      "endIntentSeconds",
      "tags",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${episode.id},
      ${nextSceneNumber},
      ${title},
      ${input.scriptText},
      ${rangeStart},
      ${rangeEnd},
      ${normalizedTags ? (normalizedTags as Prisma.InputJsonValue) : null},
      NOW(),
      NOW()
    )
    RETURNING
      "id",
      "showEpisodeId",
      "sceneNumber",
      "title",
      "scriptText",
      "startIntentSeconds",
      "endIntentSeconds",
      "tags",
      "createdAt",
      "updatedAt"
  `;

  return rows[0] ? mapShowSceneRecord(rows[0]) : null;
}

export async function updateShowScene(
  current: ShowSceneRecord,
  input: z.infer<typeof updateShowSceneSchema>
) {
  const nextStart = input.startIntentSeconds !== undefined ? input.startIntentSeconds : current.startIntentSeconds;
  const nextEnd = input.endIntentSeconds !== undefined ? input.endIntentSeconds : current.endIntentSeconds;

  if (nextStart !== null && nextStart !== undefined && nextEnd !== null && nextEnd !== undefined && nextEnd < nextStart) {
    throw new Error("End intent must be greater than or equal to start intent");
  }

  const assignments: Prisma.Sql[] = [];

  if (input.title !== undefined) {
    assignments.push(Prisma.sql`"title" = ${input.title.trim()}`);
  }
  if (input.scriptText !== undefined) {
    assignments.push(Prisma.sql`"scriptText" = ${input.scriptText}`);
  }
  if (input.startIntentSeconds !== undefined) {
    assignments.push(Prisma.sql`"startIntentSeconds" = ${input.startIntentSeconds}`);
  }
  if (input.endIntentSeconds !== undefined) {
    assignments.push(Prisma.sql`"endIntentSeconds" = ${input.endIntentSeconds}`);
  }
  if (input.tags !== undefined) {
    const normalizedTags = normalizeSceneTags(input.tags);
    assignments.push(
      Prisma.sql`"tags" = ${
        normalizedTags ? (normalizedTags as Prisma.InputJsonValue) : null
      }`
    );
  }

  assignments.push(Prisma.sql`"updatedAt" = NOW()`);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      showEpisodeId: string;
      sceneNumber: number;
      title: string;
      scriptText: string;
      startIntentSeconds: number | null;
      endIntentSeconds: number | null;
      tags: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    UPDATE "ShowScene"
    SET ${Prisma.join(assignments, ", ")}
    WHERE "id" = ${current.id}
    RETURNING
      "id",
      "showEpisodeId",
      "sceneNumber",
      "title",
      "scriptText",
      "startIntentSeconds",
      "endIntentSeconds",
      "tags",
      "createdAt",
      "updatedAt"
  `;

  return rows[0] ? mapShowSceneRecord(rows[0]) : null;
}

export async function reorderShowScenes(episode: ShowEpisodeRecord, sceneIds: string[]) {
  const currentScenes = await listShowScenes(episode.id);
  if (currentScenes.length !== sceneIds.length) {
    throw new Error("Scene reorder payload must include every scene in the episode");
  }

  const expectedIds = new Set(currentScenes.map((scene) => scene.id));
  const nextIds = new Set(sceneIds);

  if (expectedIds.size !== nextIds.size || sceneIds.some((sceneId) => !expectedIds.has(sceneId))) {
    throw new Error("Scene reorder payload contains invalid scenes");
  }

  await prisma.$transaction([
    ...sceneIds.map((sceneId, index) =>
      prisma.$executeRaw`
        UPDATE "ShowScene"
        SET
          "sceneNumber" = ${-1 * (index + 1)},
          "updatedAt" = NOW()
        WHERE "id" = ${sceneId} AND "showEpisodeId" = ${episode.id}
      `
    ),
    ...sceneIds.map((sceneId, index) =>
      prisma.$executeRaw`
        UPDATE "ShowScene"
        SET
          "sceneNumber" = ${index + 1},
          "updatedAt" = NOW()
        WHERE "id" = ${sceneId} AND "showEpisodeId" = ${episode.id}
      `
    )
  ]);

  return listShowScenes(episode.id);
}
