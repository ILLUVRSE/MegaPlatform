export const dynamic = "force-dynamic";

/**
 * Upload finalization API.
 * POST: { projectId, kind, key, publicUrl, contentType, contentLength } -> { asset }
 * Guard: authenticated creator/admin + per-user rate limit.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getPublicUrl, headObject } from "@illuvrse/storage";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { UPLOAD_KINDS, validateUploadPayload } from "@/lib/uploadRules";

const finalizeSchema = z.object({
  projectId: z.string().min(2),
  kind: z.enum(UPLOAD_KINDS),
  key: z.string().min(4),
  publicUrl: z.string().url(),
  contentType: z.string().min(3),
  contentLength: z.number().int().positive()
});

const ASSET_KIND_BY_UPLOAD_KIND = {
  IMAGE_UPLOAD: "IMAGE_UPLOAD",
  VIDEO_UPLOAD: "VIDEO_UPLOAD",
  AUDIO_UPLOAD: "AUDIO_UPLOAD"
} as const;

export async function POST(request: Request) {
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
    key: `upload-finalize:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many upload finalize requests", retryAfterSec: rateLimit.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  const body = await request.json();
  const parsed = finalizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.studioProject.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true, createdById: true }
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (principal.role !== "admin" && project.createdById !== principal.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!parsed.data.key.startsWith("studio/uploads/")) {
    return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  }
  const requiredPrefix = `studio/uploads/${parsed.data.projectId}/`;
  if (!parsed.data.key.startsWith(requiredPrefix)) {
    return NextResponse.json({ error: "Upload key does not match project namespace" }, { status: 400 });
  }

  const expectedPublicUrl = getPublicUrl(parsed.data.key);
  if (expectedPublicUrl !== parsed.data.publicUrl) {
    return NextResponse.json({ error: "Public URL mismatch" }, { status: 400 });
  }

  const validationError = validateUploadPayload({
    kind: parsed.data.kind,
    contentType: parsed.data.contentType,
    contentLength: parsed.data.contentLength
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const info = await headObject(parsed.data.key);
    if (info?.contentLength != null && info.contentLength !== parsed.data.contentLength) {
      return NextResponse.json({ error: "Upload size mismatch" }, { status: 400 });
    }
    const normalizedObjectType = info?.contentType?.split(";")[0]?.trim().toLowerCase();
    const normalizedRequestType = parsed.data.contentType.trim().toLowerCase();
    if (normalizedObjectType && normalizedObjectType !== normalizedRequestType) {
      return NextResponse.json({ error: "Upload content type mismatch" }, { status: 400 });
    }
  } catch {
    // ignore head failures
  }

  const existing = await prisma.studioAsset.findFirst({
    where: { projectId: parsed.data.projectId, storageKey: parsed.data.key },
    orderBy: { createdAt: "desc" }
  });
  if (existing) {
    return NextResponse.json({ asset: existing });
  }

  const asset = await prisma.studioAsset.create({
    data: {
      projectId: parsed.data.projectId,
      kind: ASSET_KIND_BY_UPLOAD_KIND[parsed.data.kind],
      url: parsed.data.publicUrl,
      storageKey: parsed.data.key,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.contentLength,
      temporary: true,
      metaJson: {
        key: parsed.data.key,
        contentType: parsed.data.contentType,
        contentLength: parsed.data.contentLength,
        uploadedAt: new Date().toISOString(),
        temporary: true
      }
    }
  });

  return NextResponse.json({ asset });
}
