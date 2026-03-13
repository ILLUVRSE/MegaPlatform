export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { findShowEpisodeById } from "@/lib/showEpisodes";
import { createShowScene, createShowSceneSchema, listShowScenes } from "@/lib/showScenes";
import { canManageAllShowProjects } from "@/lib/showProjects";

export async function GET(
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

  const scenes = await listShowScenes(episode.id);
  return NextResponse.json({ scenes });
}

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

  const parsed = createShowSceneSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const scene = await createShowScene(episode, parsed.data);
    return NextResponse.json({ scene }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create scene" },
      { status: 400 }
    );
  }
}
