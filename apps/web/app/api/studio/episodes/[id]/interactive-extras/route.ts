export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { findShowEpisodeById } from "@/lib/showEpisodes";
import {
  createInteractiveExtra,
  createInteractiveExtraSchema,
  listInteractiveExtrasForEpisode
} from "@/lib/interactiveExtras";
import { getShowProjectAccessForUser } from "@/lib/showProjects";

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
  const access = await getShowProjectAccessForUser(principal, episode.showProjectId);
  if (!access.permissions.read) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const extras = await listInteractiveExtrasForEpisode(episode.id);
  return NextResponse.json({ extras });
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
  const access = await getShowProjectAccessForUser(principal, episode.showProjectId);
  if (!access.permissions.editExtras) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createInteractiveExtraSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const extra = await createInteractiveExtra({
    episodeId: episode.id,
    type: parsed.data.type,
    title: parsed.data.title,
    payload: parsed.data.payload,
    publishStatus: parsed.data.publishStatus
  });

  return NextResponse.json({ extra }, { status: 201 });
}
