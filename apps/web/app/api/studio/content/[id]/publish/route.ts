export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import { assertValidTransition, toContentState } from "@/lib/contentLifecycle";
import { contentDb } from "@/lib/contentDb";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional()
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

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const content = await contentDb.contentItem.findUnique({ where: { id } });
  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  if (content.creatorId && content.creatorId !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fromState = toContentState(content.state);
  const toState = "PUBLISHED" as const;

  try {
    assertValidTransition(fromState, toState);
  } catch {
    return NextResponse.json({ error: `Invalid transition ${fromState} -> ${toState}` }, { status: 409 });
  }

  const updated = await contentDb.contentItem.update({
    where: { id },
    data: { state: toState }
  });

  await contentDb.contentStateTransition.create({
    data: {
      contentId: id,
      fromState,
      toState,
      actorId: principal.userId,
      reason: parsed.data.reason ?? null
    }
  });

  return NextResponse.json({ content: updated, transition: { fromState, toState } });
}
