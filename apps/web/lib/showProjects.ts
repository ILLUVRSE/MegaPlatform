import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import type { Principal } from "@/lib/authz";

export type ShowProjectFormat = "SERIES" | "MOVIE";
export type ShowProjectStatus = "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";

export type ShowProjectRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: ShowProjectFormat;
  status: ShowProjectStatus;
  publishedAt: Date | null;
  ownerId: string;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShowProjectWithOwner = ShowProjectRecord & {
  ownerName: string | null;
  ownerEmail: string | null;
};

export function normalizeShowProjectSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function canManageAllShowProjects(principal: Principal) {
  return principal.role === "admin" || principal.permissions.includes("admin:*");
}

export async function findShowProjectBySlug(slug: string) {
  const rows = await prisma.$queryRaw<ShowProjectRecord[]>`
    SELECT
      "id",
      "slug",
      "title",
      "description",
      "format"::text AS "format",
      "status"::text AS "status",
      "publishedAt",
      "ownerId",
      "posterImageUrl",
      "bannerImageUrl",
      "createdAt",
      "updatedAt"
    FROM "ShowProject"
    WHERE "id" = ${slug} OR "slug" = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findShowProjectWithOwnerBySlug(slug: string) {
  const rows = await prisma.$queryRaw<ShowProjectWithOwner[]>`
    SELECT
      project."id",
      project."slug",
      project."title",
      project."description",
      project."format"::text AS "format",
      project."status"::text AS "status",
      project."publishedAt",
      project."ownerId",
      project."posterImageUrl",
      project."bannerImageUrl",
      project."createdAt",
      project."updatedAt",
      owner."name" AS "ownerName",
      owner."email" AS "ownerEmail"
    FROM "ShowProject" project
    INNER JOIN "User" owner ON owner."id" = project."ownerId"
    WHERE project."id" = ${slug} OR project."slug" = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listShowProjects(
  principal: Principal,
  input?: {
    format?: ShowProjectFormat;
    status?: ShowProjectStatus;
  }
) {
  const clauses: Prisma.Sql[] = [];

  if (!canManageAllShowProjects(principal)) {
    clauses.push(Prisma.sql`"ownerId" = ${principal.userId}`);
  }
  if (input?.format) {
    clauses.push(Prisma.sql`"format" = ${input.format}::"ShowProjectFormat"`);
  }
  if (input?.status) {
    clauses.push(Prisma.sql`"status" = ${input.status}::"ShowProjectStatus"`);
  }

  const whereClause = clauses.length
    ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw<ShowProjectRecord[]>`
    SELECT
      "id",
      "slug",
      "title",
      "description",
      "format"::text AS "format",
      "status"::text AS "status",
      "publishedAt",
      "ownerId",
      "posterImageUrl",
      "bannerImageUrl",
      "createdAt",
      "updatedAt"
    FROM "ShowProject"
    ${whereClause}
    ORDER BY "updatedAt" DESC, "createdAt" DESC
    LIMIT 50
  `;
}

export async function buildUniqueShowProjectSlug(title: string) {
  const baseSlug = normalizeShowProjectSlug(title) || "show-project";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await findShowProjectBySlug(slug);
    if (!existing) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

export async function createShowProject(input: {
  ownerId: string;
  title: string;
  description?: string | null;
  format: ShowProjectFormat;
  posterImageUrl?: string | null;
  bannerImageUrl?: string | null;
}) {
  const slug = await buildUniqueShowProjectSlug(input.title);
  const rows = await prisma.$queryRaw<ShowProjectRecord[]>`
    INSERT INTO "ShowProject" (
      "id",
      "slug",
      "title",
      "description",
      "format",
      "status",
      "publishedAt",
      "ownerId",
      "posterImageUrl",
      "bannerImageUrl",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${slug},
      ${input.title},
      ${input.description ?? null},
      ${input.format}::"ShowProjectFormat",
      'DRAFT'::"ShowProjectStatus",
      NULL,
      ${input.ownerId},
      ${input.posterImageUrl ?? null},
      ${input.bannerImageUrl ?? null},
      NOW(),
      NOW()
    )
    RETURNING
      "id",
      "slug",
      "title",
      "description",
      "format"::text AS "format",
      "status"::text AS "status",
      "publishedAt",
      "ownerId",
      "posterImageUrl",
      "bannerImageUrl",
      "createdAt",
      "updatedAt"
  `;

  return rows[0] ?? null;
}
