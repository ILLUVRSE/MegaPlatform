export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { findShowEpisodeById } from "@/lib/showEpisodes";
import { canManageAllShowProjects } from "@/lib/showProjects";
import { publishShowEpisodeToWatch, StudioPublishError } from "@/lib/studioShowPublish";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

  const { id } = await params;
  const episode = await findShowEpisodeById(id);
  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  if (!canManageAllShowProjects(principal) && episode.ownerId !== principal.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await publishShowEpisodeToWatch(episode.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudioPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
