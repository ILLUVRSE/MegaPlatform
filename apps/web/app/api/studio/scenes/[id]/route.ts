export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { findShowSceneById, updateShowScene, updateShowSceneSchema } from "@/lib/showScenes";
import { getShowProjectAccessForUser } from "@/lib/showProjects";

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
  const current = await findShowSceneById(id);
  if (!current) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  const access = await getShowProjectAccessForUser(principal, current.showProjectId);
  if (!access.permissions.editScenes) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateShowSceneSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const scene = await updateShowScene(current, parsed.data);
    return NextResponse.json({ scene });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update scene" },
      { status: 400 }
    );
  }
}
