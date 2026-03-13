export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  SHOW_PROJECT_COLLABORATOR_ROLES,
  findShowProjectBySlug,
  getShowProjectAccessForUser,
  removeShowProjectCollaborator,
  updateShowProjectCollaboratorRole
} from "@/lib/showProjects";

const updateCollaboratorSchema = z.object({
  role: z.enum(SHOW_PROJECT_COLLABORATOR_ROLES)
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; collaboratorId: string }> }
) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, collaboratorId } = await params;
  const project = await findShowProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Show project not found" }, { status: 404 });
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.manageCollaborators) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateCollaboratorSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const collaborator = await updateShowProjectCollaboratorRole({
    showProjectId: project.id,
    collaboratorId,
    role: parsed.data.role
  });

  if (!collaborator) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  return NextResponse.json({ collaborator });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; collaboratorId: string }> }
) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, collaboratorId } = await params;
  const project = await findShowProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Show project not found" }, { status: 404 });
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.manageCollaborators) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborator = await removeShowProjectCollaborator(project.id, collaboratorId);
  if (!collaborator) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  return NextResponse.json({ collaborator });
}
