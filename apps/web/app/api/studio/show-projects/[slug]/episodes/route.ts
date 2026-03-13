export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  createShowEpisode,
  createShowEpisodeSchema,
  listShowEpisodes
} from "@/lib/showEpisodes";
import { findShowProjectBySlug, getShowProjectAccessForUser } from "@/lib/showProjects";

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

  const episodes = await listShowEpisodes(project.id);
  return NextResponse.json({ project, episodes });
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
  if (!access.permissions.editEpisodes) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createShowEpisodeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const episode = await createShowEpisode({
    project,
    templateType: parsed.data.templateType,
    seasonNumber: parsed.data.seasonNumber ?? null,
    episodeNumber: parsed.data.episodeNumber ?? null
  });

  return NextResponse.json({ episode }, { status: 201 });
}
