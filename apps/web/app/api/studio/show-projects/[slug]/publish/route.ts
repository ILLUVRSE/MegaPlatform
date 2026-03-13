export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import { PREMIERE_TYPES } from "@/lib/releaseScheduling";
import { findShowProjectBySlug, getShowProjectAccessForUser } from "@/lib/showProjects";
import { publishShowProjectToWatch, StudioPublishError } from "@/lib/studioShowPublish";

const publishProjectSchema = z.object({
  premiereType: z.enum(PREMIERE_TYPES).optional(),
  releaseAt: z.string().datetime().nullable().optional()
});

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
  if (!access.permissions.publish) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = publishProjectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid publish schedule" }, { status: 400 });
  }

  try {
    const result = await publishShowProjectToWatch(project.id, {
      premiereType: parsed.data.premiereType,
      releaseAt: parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudioPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
