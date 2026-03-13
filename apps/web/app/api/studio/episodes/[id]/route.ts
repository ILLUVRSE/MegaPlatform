export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  findShowEpisodeById,
  updateShowEpisode,
  updateShowEpisodeSchema
} from "@/lib/showEpisodes";
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

  return NextResponse.json({ episode });
}

export async function PATCH(
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
  const current = await findShowEpisodeById(id);
  if (!current) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  if (!canManageAllShowProjects(principal) && current.ownerId !== principal.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateShowEpisodeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const episode = await updateShowEpisode(current, parsed.data);
  return NextResponse.json({ episode });
}
