export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import { getShowProjectAccessForUser } from "@/lib/showProjects";
import { findShowExtraById, updateShowExtra, updateShowExtraSchema } from "@/lib/showExtras";

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
  const extra = await findShowExtraById(id);
  if (!extra) {
    return NextResponse.json({ error: "Extra not found" }, { status: 404 });
  }
  const access = await getShowProjectAccessForUser(principal, extra.showProjectId);
  if (!access.permissions.read) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ extra });
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
  const current = await findShowExtraById(id);
  if (!current) {
    return NextResponse.json({ error: "Extra not found" }, { status: 404 });
  }
  const access = await getShowProjectAccessForUser(principal, current.showProjectId);
  if (!access.permissions.editExtras) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateShowExtraSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const releaseAt =
    parsed.data.releaseAt === undefined ? undefined : parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null;
  const premiereType = parsed.data.premiereType ?? current.premiereType;
  const nextReleaseAt = releaseAt === undefined ? current.releaseAt : releaseAt;

  if (premiereType === "SCHEDULED") {
    if (!nextReleaseAt || Number.isNaN(nextReleaseAt.getTime())) {
      return NextResponse.json(
        { error: "Scheduled premieres require a valid release date and time." },
        { status: 400 }
      );
    }

    const isUnchangedReleasedSchedule =
      current.premiereType === "SCHEDULED" &&
      current.releaseAt &&
      current.releaseAt.getTime() === nextReleaseAt.getTime();

    if (!isUnchangedReleasedSchedule && nextReleaseAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Scheduled premieres must use a future release date and time." },
        { status: 400 }
      );
    }
  }

  const extra = await updateShowExtra(current, {
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    assetUrl: parsed.data.assetUrl,
    runtimeSeconds: parsed.data.runtimeSeconds,
    status: parsed.data.status,
    premiereType,
    releaseAt: premiereType === "SCHEDULED" ? nextReleaseAt : null
  });

  return NextResponse.json({ extra });
}
