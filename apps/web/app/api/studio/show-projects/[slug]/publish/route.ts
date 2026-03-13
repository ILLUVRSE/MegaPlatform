export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { canManageShowProject } from "@/lib/showEpisodes";
import { findShowProjectBySlug } from "@/lib/showProjects";
import { publishShowProjectToWatch, StudioPublishError } from "@/lib/studioShowPublish";

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
  if (!canManageShowProject(principal, project)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await publishShowProjectToWatch(project.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudioPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
