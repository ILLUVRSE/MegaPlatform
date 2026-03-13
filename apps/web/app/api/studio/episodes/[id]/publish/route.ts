export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import { PREMIERE_TYPES } from "@/lib/releaseScheduling";
import { findShowEpisodeById } from "@/lib/showEpisodes";
import { getShowProjectAccessForUser } from "@/lib/showProjects";
import { publishShowEpisodeToWatch, StudioPublishError } from "@/lib/studioShowPublish";

const publishEpisodeSchema = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]).optional(),
  allowedRegions: z.array(z.string().trim().min(2)).nullable().optional(),
  requiresEntitlement: z.boolean().optional(),
  premiereType: z.enum(PREMIERE_TYPES).optional(),
  releaseAt: z.string().datetime().nullable().optional(),
  isPremiereEnabled: z.boolean().optional(),
  premiereStartsAt: z.string().datetime().nullable().optional(),
  premiereEndsAt: z.string().datetime().nullable().optional(),
  chatEnabled: z.boolean().optional()
});

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
  if (!access.permissions.publish) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = publishEpisodeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid publish schedule" }, { status: 400 });
  }

  try {
    const result = await publishShowEpisodeToWatch(episode.id, {
      visibility: parsed.data.visibility,
      allowedRegions: parsed.data.allowedRegions ?? null,
      requiresEntitlement: parsed.data.requiresEntitlement,
      premiereType: parsed.data.premiereType,
      releaseAt: parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null,
      isPremiereEnabled: parsed.data.isPremiereEnabled,
      premiereStartsAt: parsed.data.premiereStartsAt ? new Date(parsed.data.premiereStartsAt) : null,
      premiereEndsAt: parsed.data.premiereEndsAt ? new Date(parsed.data.premiereEndsAt) : null,
      chatEnabled: parsed.data.chatEnabled
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudioPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
