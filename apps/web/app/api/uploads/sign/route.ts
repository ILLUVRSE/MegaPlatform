export const dynamic = "force-dynamic";

/**
 * Signed upload URL API.
 * POST: { projectId?, kind, filename, contentType, contentLength } -> { key, uploadUrl, publicUrl, headers }
 * Guard: authenticated creator/admin + per-user rate limit.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@illuvrse/db";
import { getPublicUrl, getSignedUploadUrl } from "@illuvrse/storage";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { UPLOAD_KINDS, validateUploadPayload } from "@/lib/uploadRules";

const signSchema = z.object({
  projectId: z.string().optional(),
  kind: z.enum(UPLOAD_KINDS),
  filename: z.string().min(1),
  contentType: z.string().min(3),
  contentLength: z.number().int().positive()
});

const SIGNED_UPLOAD_TTL_SEC = Number(process.env.S3_SIGNED_UPLOAD_TTL_SEC ?? 300);

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

  if (parsed.data.projectId) {
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
  }

  const validationError = validateUploadPayload({
    kind: parsed.data.kind,
    contentType: parsed.data.contentType,
    contentLength: parsed.data.contentLength
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const safeName = sanitizeFilename(parsed.data.filename);
  const projectSegment = sanitizePathSegment(parsed.data.projectId ?? principal.userId);
  if (!projectSegment) {
    return NextResponse.json({ error: "Invalid project segment" }, { status: 400 });
  }
  const key = `studio/uploads/${projectSegment}/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUploadUrl({
    key,
    contentType: parsed.data.contentType,
    contentLength: parsed.data.contentLength,
    expiresInSec: SIGNED_UPLOAD_TTL_SEC
  });

  return NextResponse.json({
    key,
    uploadUrl,
    expiresInSec: SIGNED_UPLOAD_TTL_SEC,
    signedAt: new Date().toISOString(),
    publicUrl: getPublicUrl(key),
    headers: {
      "Content-Type": parsed.data.contentType
    }
  });
}
