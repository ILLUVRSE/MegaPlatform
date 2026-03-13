export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  SHOW_PROJECT_COLLABORATOR_ROLES,
  addShowProjectCollaborator,
  findShowProjectBySlug,
  getShowProjectAccessForUser,
  listShowProjectCollaborators
} from "@/lib/showProjects";

const collaboratorSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(SHOW_PROJECT_COLLABORATOR_ROLES)
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
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

  const { slug } = await params;
  const project = await findShowProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Show project not found" }, { status: 404 });
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.read) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborators = await listShowProjectCollaborators(project.id);
  return NextResponse.json({ collaborators, access });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
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

  const { slug } = await params;
  const project = await findShowProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Show project not found" }, { status: 404 });
  }

  const access = await getShowProjectAccessForUser(principal, project.id);
  if (!access.permissions.manageCollaborators) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = collaboratorSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const collaborator = await addShowProjectCollaborator({
      showProjectId: project.id,
      email: parsed.data.email,
      role: parsed.data.role
    });

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add collaborator" },
      { status: 400 }
    );
  }
}
