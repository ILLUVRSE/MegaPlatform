export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { findShowEpisodeById } from "@/lib/showEpisodes";
import { reorderShowScenes, reorderShowScenesSchema } from "@/lib/showScenes";
import { getShowProjectAccessForUser } from "@/lib/showProjects";

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
  const access = await getShowProjectAccessForUser(principal, episode.showProjectId);
  if (!access.permissions.editScenes) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = reorderShowScenesSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const scenes = await reorderShowScenes(episode, parsed.data.sceneIds);
    return NextResponse.json({ scenes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reorder scenes" },
      { status: 400 }
    );
  }
}
