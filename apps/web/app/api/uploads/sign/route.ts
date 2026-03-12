export const dynamic = "force-dynamic";

/**
 * Signed upload URL API.
 * POST: { projectId, filename, contentType, uploadId } -> { objectKey, uploadUrl, expiresInSec, signedAt }
 * Guard: authenticated creator/admin + per-user rate limit.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getPublicUrl, getSignedUploadUrl } from "@illuvrse/storage";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const signSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(3),
  uploadId: z.string().min(1),
  contentLength: z.number().int().positive().optional()
});

const SIGNED_UPLOAD_TTL_SEC = 600;

function sanitizeFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  const normalized = base
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-");
  const [namePart, ...extParts] = normalized.split(".");
  const name = namePart?.length ? namePart : "upload";
  const ext = extParts.length > 0 ? `.${extParts.pop()}` : "";
  return `${name}${ext}`.slice(0, 120);
}

function sanitizePathSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

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
    key: `upload-sign:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many upload sign requests", retryAfterSec: rateLimit.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  const body = await request.json();
  const parsed = signSchema.safeParse(body);
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

  const safeName = sanitizeFilename(parsed.data.filename);
  const projectSegment = sanitizePathSegment(parsed.data.projectId);
  const uploadSegment = sanitizePathSegment(parsed.data.uploadId);
  if (!projectSegment || !uploadSegment || !safeName) {
    return NextResponse.json({ error: "Invalid upload key inputs" }, { status: 400 });
  }
  const objectKey = `projects/${projectSegment}/uploads/${uploadSegment}/${safeName}`;

  const signedUpload = await getSignedUploadUrl({
    key: objectKey,
    contentType: parsed.data.contentType,
    contentLength: parsed.data.contentLength,
    expiresInSec: SIGNED_UPLOAD_TTL_SEC
  });

  return NextResponse.json({
    objectKey,
    key: objectKey,
    uploadUrl: signedUpload.uploadUrl,
    expiresInSec: signedUpload.expiresInSec,
    signedAt: signedUpload.signedAt,
    publicUrl: getPublicUrl(objectKey),
    headers: {
      "Content-Type": parsed.data.contentType
    }
  });
}
