export const dynamic = "force-dynamic";

/**
 * Studio asset creation API for generated/render outputs.
 * POST: { kind, url, metaJson? } -> { asset }
 * Guard: authenticated owner/admin. Upload assets must use /api/uploads/finalize.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const DIRECT_ASSET_KINDS = ["SHORT_MP4", "MEME_PNG", "THUMBNAIL", "TEXT", "HLS_MANIFEST"] as const;

const assetSchema = z.object({
  kind: z.enum(DIRECT_ASSET_KINDS),
  url: z.string().min(4),
  metaJson: z.record(z.any()).optional()
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

  const rateLimit = await checkRateLimit({
    key: `studio:assets:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 40
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.studioProject.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.createdById && project.createdById !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asset = await prisma.studioAsset.create({
    data: {
      projectId: project.id,
      kind: parsed.data.kind,
      url: parsed.data.url,
      temporary: true,
      metaJson: {
        lifecycleState: "draft_asset",
        projectId: project.id,
        ...(parsed.data.metaJson ?? {})
      }
    }
  });

  return NextResponse.json({ asset });
}
