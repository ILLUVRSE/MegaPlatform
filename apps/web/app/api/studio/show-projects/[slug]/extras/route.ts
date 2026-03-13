export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  canManageShowExtra,
  createShowExtra,
  createShowExtraSchema,
  listShowExtras
} from "@/lib/showExtras";
import { normalizeReleaseSchedule, ReleaseScheduleError } from "@/lib/releaseScheduling";
import { findShowProjectBySlug } from "@/lib/showProjects";

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
  if (!canManageShowExtra(principal, project)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const extras = await listShowExtras(project.id);
  return NextResponse.json({ project, extras });
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
  if (!canManageShowExtra(principal, project)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createShowExtraSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const schedule = normalizeReleaseSchedule({
      premiereType: parsed.data.premiereType,
      releaseAt: parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null
    });
    const extra = await createShowExtra({
      project,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assetUrl: parsed.data.assetUrl,
      runtimeSeconds: parsed.data.runtimeSeconds ?? null,
      status: parsed.data.status,
      ...schedule
    });

    return NextResponse.json({ extra }, { status: 201 });
  } catch (error) {
    if (error instanceof ReleaseScheduleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
