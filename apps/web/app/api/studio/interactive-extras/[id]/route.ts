export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  findInteractiveExtraById,
  updateInteractiveExtra,
  updateInteractiveExtraSchema
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
  const extra = await findInteractiveExtraById(id);
  if (!extra) {
    return NextResponse.json({ error: "Interactive extra not found" }, { status: 404 });
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
  const current = await findInteractiveExtraById(id);
  if (!current) {
    return NextResponse.json({ error: "Interactive extra not found" }, { status: 404 });
  }
  const access = await getShowProjectAccessForUser(principal, current.showProjectId);
  if (!access.permissions.editExtras) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateInteractiveExtraSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const extra = await updateInteractiveExtra(current, {
    type: parsed.data.type,
    title: parsed.data.title,
    payload: parsed.data.payload,
    publishStatus: parsed.data.publishStatus
  });

  return NextResponse.json({ extra });
}
