import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@illuvrse/db";
import type { Principal } from "@/lib/authz";
import type { PremiereType } from "@/lib/releaseScheduling";

export const SHOW_PROJECT_COLLABORATOR_ROLES = ["OWNER", "EDITOR", "WRITER", "PRODUCER", "VIEWER"] as const;

export type ShowProjectCollaboratorRole = (typeof SHOW_PROJECT_COLLABORATOR_ROLES)[number];
export type ShowProjectFormat = "SERIES" | "MOVIE";
export type ShowProjectStatus = "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
export type ShowProjectAbility =
  | "read"
  | "editProject"
  | "editEpisodes"
  | "editScenes"
  | "editExtras"
  | "publish"
  | "manageCollaborators";

export type ShowProjectRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: ShowProjectFormat;
  status: ShowProjectStatus;
  publishedAt: Date | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowedRegions: string[] | null;
  requiresEntitlement: boolean;
  premiereType: PremiereType;
  releaseAt: Date | null;
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

export type ShowProjectSummary = ShowProjectRecord & {
  currentUserRole: ShowProjectCollaboratorRole | null;
};

export type ShowProjectCollaboratorRecord = {
  id: string;
  showProjectId: string;
  userId: string;
  role: ShowProjectCollaboratorRole;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ShowProjectPermissions = Record<ShowProjectAbility, boolean>;

export type ShowProjectAccess = {
  role: ShowProjectCollaboratorRole | null;
  permissions: ShowProjectPermissions;
};

const SHOW_PROJECT_ROLE_ABILITIES: Record<ShowProjectCollaboratorRole, ShowProjectAbility[]> = {
  OWNER: ["read", "editProject", "editEpisodes", "editScenes", "editExtras", "publish", "manageCollaborators"],
  EDITOR: ["read", "editProject", "editEpisodes", "editScenes", "editExtras", "publish"],
  WRITER: ["read", "editEpisodes", "editScenes"],
  PRODUCER: ["read", "editProject", "editEpisodes", "editExtras", "publish"],
  VIEWER: ["read"]
};

function selectShowProjectFields(alias?: string) {
  const table = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`
    ${table}"id",
    ${table}"slug",
    ${table}"title",
    ${table}"description",
    ${table}"format"::text AS "format",
    ${table}"status"::text AS "status",
    ${table}"publishedAt",
    ${table}"visibility"::text AS "visibility",
    ${table}"allowedRegions",
    ${table}"requiresEntitlement",
    ${table}"premiereType"::text AS "premiereType",
    ${table}"releaseAt",
    ${table}"ownerId",
    ${table}"posterImageUrl",
    ${table}"bannerImageUrl",
    ${table}"createdAt",
    ${table}"updatedAt"
  `;
}

function selectShowProjectCollaboratorFields(alias = "collaborator") {
  const table = Prisma.raw(`${alias}.`);
  return Prisma.sql`
    ${table}"id",
    ${table}"showProjectId",
    ${table}"userId",
    ${table}"role"::text AS "role",
    member."name",
    member."email",
    ${table}"createdAt",
    ${table}"updatedAt"
  `;
}

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

export function buildShowProjectPermissions(
  principal: Pick<Principal, "role" | "permissions">,
  role: ShowProjectCollaboratorRole | null
): ShowProjectPermissions {
  if (principal.role === "admin" || principal.permissions.includes("admin:*")) {
    return {
      read: true,
      editProject: true,
      editEpisodes: true,
      editScenes: true,
      editExtras: true,
      publish: true,
      manageCollaborators: true
    };
  }

  return {
    read: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("read"),
    editProject: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("editProject"),
    editEpisodes: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("editEpisodes"),
    editScenes: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("editScenes"),
    editExtras: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("editExtras"),
    publish: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("publish"),
    manageCollaborators: role !== null && SHOW_PROJECT_ROLE_ABILITIES[role].includes("manageCollaborators")
  };
}

export function getShowProjectAccess(
  principal: Pick<Principal, "role" | "permissions">,
  role: ShowProjectCollaboratorRole | null
): ShowProjectAccess {
  return {
    role,
    permissions: buildShowProjectPermissions(principal, role)
  };
}

export async function findShowProjectBySlug(slug: string) {
  const rows = await prisma.$queryRaw<ShowProjectRecord[]>`
    SELECT ${selectShowProjectFields()}
    FROM "ShowProject"
    WHERE "id" = ${slug} OR "slug" = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findShowProjectWithOwnerBySlug(slug: string) {
  const rows = await prisma.$queryRaw<ShowProjectWithOwner[]>`
    SELECT
      ${selectShowProjectFields("project")},
      owner."name" AS "ownerName",
      owner."email" AS "ownerEmail"
    FROM "ShowProject" project
    INNER JOIN "User" owner ON owner."id" = project."ownerId"
    WHERE project."id" = ${slug} OR project."slug" = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findShowProjectRoleForUser(showProjectId: string, userId: string) {
  const rows = await prisma.$queryRaw<Array<{ ownerId: string; collaboratorRole: ShowProjectCollaboratorRole | null }>>`
    SELECT
      project."ownerId",
      collaborator."role"::text AS "collaboratorRole"
    FROM "ShowProject" project
    LEFT JOIN "ShowProjectCollaborator" collaborator
      ON collaborator."showProjectId" = project."id"
      AND collaborator."userId" = ${userId}
    WHERE project."id" = ${showProjectId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  if (row.ownerId === userId) {
    return "OWNER" satisfies ShowProjectCollaboratorRole;
  }

  return row.collaboratorRole ?? null;
}

export async function getShowProjectAccessForUser(principal: Principal, showProjectId: string) {
  const role = canManageAllShowProjects(principal)
    ? null
    : await findShowProjectRoleForUser(showProjectId, principal.userId);

  return getShowProjectAccess(principal, role);
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
    clauses.push(
      Prisma.sql`(project."ownerId" = ${principal.userId} OR current_collaborator."userId" IS NOT NULL)`
    );
  }
  if (input?.format) {
    clauses.push(Prisma.sql`project."format" = ${input.format}::"ShowProjectFormat"`);
  }
  if (input?.status) {
    clauses.push(Prisma.sql`project."status" = ${input.status}::"ShowProjectStatus"`);
  }

  const whereClause = clauses.length
    ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw<ShowProjectSummary[]>`
    SELECT
      ${selectShowProjectFields("project")},
      CASE
        WHEN project."ownerId" = ${principal.userId} THEN 'OWNER'
        ELSE current_collaborator."role"::text
      END AS "currentUserRole"
    FROM "ShowProject" project
    LEFT JOIN "ShowProjectCollaborator" current_collaborator
      ON current_collaborator."showProjectId" = project."id"
      AND current_collaborator."userId" = ${principal.userId}
    ${whereClause}
    ORDER BY project."updatedAt" DESC, project."createdAt" DESC
    LIMIT 50
  `;
}

export async function listShowProjectCollaborators(showProjectId: string) {
  return prisma.$queryRaw<ShowProjectCollaboratorRecord[]>`
    SELECT ${selectShowProjectCollaboratorFields()}
    FROM "ShowProjectCollaborator" collaborator
    INNER JOIN "User" member ON member."id" = collaborator."userId"
    WHERE collaborator."showProjectId" = ${showProjectId}
      AND collaborator."userId" <> (
        SELECT "ownerId" FROM "ShowProject" WHERE "id" = ${showProjectId}
      )
    ORDER BY
      CASE collaborator."role"
        WHEN 'OWNER'::"ShowProjectCollaboratorRole" THEN 0
        WHEN 'EDITOR'::"ShowProjectCollaboratorRole" THEN 1
        WHEN 'PRODUCER'::"ShowProjectCollaboratorRole" THEN 2
        WHEN 'WRITER'::"ShowProjectCollaboratorRole" THEN 3
        ELSE 4
      END ASC,
      collaborator."createdAt" ASC
  `;
}

export async function findShowProjectCollaboratorById(showProjectId: string, collaboratorId: string) {
  const rows = await prisma.$queryRaw<ShowProjectCollaboratorRecord[]>`
    SELECT ${selectShowProjectCollaboratorFields()}
    FROM "ShowProjectCollaborator" collaborator
    INNER JOIN "User" member ON member."id" = collaborator."userId"
    WHERE collaborator."showProjectId" = ${showProjectId}
      AND collaborator."id" = ${collaboratorId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function addShowProjectCollaborator(input: {
  showProjectId: string;
  email: string;
  role: ShowProjectCollaboratorRole;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Collaborator email is required.");
  }

  const users = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
    SELECT "id", "email"
    FROM "User"
    WHERE LOWER("email") = ${email}
    LIMIT 1
  `;

  const user = users[0];
  if (!user) {
    throw new Error("User not found for that email.");
  }

  const owners = await prisma.$queryRaw<Array<{ ownerId: string }>>`
    SELECT "ownerId"
    FROM "ShowProject"
    WHERE "id" = ${input.showProjectId}
    LIMIT 1
  `;

  const owner = owners[0];
  if (!owner) {
    throw new Error("Show project not found.");
  }
  if (owner.ownerId === user.id) {
    throw new Error("The project owner already has full access.");
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ShowProjectCollaborator" (
      "id",
      "showProjectId",
      "userId",
      "role",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.showProjectId},
      ${user.id},
      ${input.role}::"ShowProjectCollaboratorRole",
      NOW(),
      NOW()
    )
    ON CONFLICT ("showProjectId", "userId")
    DO UPDATE SET
      "role" = EXCLUDED."role",
      "updatedAt" = NOW()
    RETURNING "id"
  `;

  const collaboratorId = rows[0]?.id;
  if (!collaboratorId) {
    return null;
  }

  return findShowProjectCollaboratorById(input.showProjectId, collaboratorId);
}

export async function updateShowProjectCollaboratorRole(input: {
  showProjectId: string;
  collaboratorId: string;
  role: ShowProjectCollaboratorRole;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "ShowProjectCollaborator"
    SET
      "role" = ${input.role}::"ShowProjectCollaboratorRole",
      "updatedAt" = NOW()
    WHERE "showProjectId" = ${input.showProjectId}
      AND "id" = ${input.collaboratorId}
    RETURNING "id"
  `;

  const collaboratorId = rows[0]?.id;
  if (!collaboratorId) {
    return null;
  }

  return findShowProjectCollaboratorById(input.showProjectId, collaboratorId);
}

export async function removeShowProjectCollaborator(showProjectId: string, collaboratorId: string) {
  const current = await findShowProjectCollaboratorById(showProjectId, collaboratorId);
  if (!current) {
    return null;
  }

  await prisma.$executeRaw`
    DELETE FROM "ShowProjectCollaborator"
    WHERE "showProjectId" = ${showProjectId}
      AND "id" = ${collaboratorId}
  `;

  return current;
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
      "premiereType",
      "releaseAt",
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
      'IMMEDIATE'::"PremiereType",
      NULL,
      ${input.ownerId},
      ${input.posterImageUrl ?? null},
      ${input.bannerImageUrl ?? null},
      NOW(),
      NOW()
    )
    RETURNING ${selectShowProjectFields()}
  `;

  return rows[0] ?? null;
}
