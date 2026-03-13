export const dynamic = "force-dynamic";

import { createHash } from "crypto";
import { readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildStudioDedupeKey, enqueueStudioJob, generateThumbnail, STUDIO_JOB_ATTEMPTS } from "@illuvrse/agent-manager";
import { prisma } from "@illuvrse/db";
import { uploadBuffer } from "@illuvrse/storage";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const headerSchema = z.object({
  projectId: z.string().min(1),
  checksumSha256: z.string().length(64),
  contentType: z.string().startsWith("video/"),
  fileName: z.string().min(1).max(240).optional(),
  title: z.string().min(1).max(120).optional(),
  caption: z.string().max(500).optional()
});

const MAX_UPLOAD_BYTES = Math.max(1_000_000, Number(process.env.SHORTS_UPLOAD_MAX_BYTES ?? 256 * 1024 * 1024));

async function readUploadStream(request: Request, expectedChecksum: string) {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error("Missing upload body");
  }

  const chunks: Uint8Array[] = [];
  const hash = createHash("sha256");
  let sizeBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    sizeBytes += value.byteLength;
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      throw new Error("Upload exceeds configured size limit");
    }
    hash.update(value);
    chunks.push(value);
  }

  const checksum = hash.digest("hex");
  if (checksum !== expectedChecksum) {
    throw new Error("Checksum mismatch");
  }

  return {
    checksum,
    sizeBytes,
    buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  };
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
    key: `shorts:upload:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 8
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many upload requests" }, { status: 429 });
  }

  const parsedHeaders = headerSchema.safeParse({
    projectId: request.headers.get("x-project-id"),
    checksumSha256: request.headers.get("x-checksum-sha256"),
    contentType: request.headers.get("content-type"),
    fileName: request.headers.get("x-file-name") ?? undefined,
    title: request.headers.get("x-title") ?? undefined,
    caption: request.headers.get("x-caption") ?? undefined
  });
  if (!parsedHeaders.success) {
    return NextResponse.json({ error: "Invalid upload headers" }, { status: 400 });
  }

  const { projectId, checksumSha256, contentType, fileName, title, caption } = parsedHeaders.data;
  const project = await prisma.studioProject.findUnique({
    where: { id: projectId },
    select: { id: true, createdById: true, title: true, description: true, type: true }
  });
  if (!project || project.type !== "SHORT") {
    return NextResponse.json({ error: "Short project not found" }, { status: 404 });
  }
  if (project.createdById && project.createdById !== principal.userId && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pendingAsset = await prisma.studioAsset.create({
    data: {
      projectId,
      kind: "VIDEO_UPLOAD",
      url: "",
      contentType,
      checksum: checksumSha256,
      status: "pending",
      temporary: true,
      metaJson: {
        lifecycleState: "pending",
        fileName: fileName ?? "upload.mp4",
        title: title ?? project.title,
        caption: caption ?? project.description ?? ""
      }
    }
  });

  try {
    const upload = await readUploadStream(request, checksumSha256);
    const sourceStorageKey = `shorts/${projectId}/uploads/${pendingAsset.uploadId}.mp4`;
    const sourceUrl = await uploadBuffer(sourceStorageKey, upload.buffer, contentType);

    const tmpVideoPath = join(tmpdir(), `illuvrse-short-upload-${pendingAsset.uploadId}.mp4`);
    await writeFile(tmpVideoPath, upload.buffer);
    const thumbnailPath = await generateThumbnail(tmpVideoPath);
    const thumbBuffer = await readFile(thumbnailPath);
    const thumbKey = `shorts/${projectId}/uploads/${pendingAsset.uploadId}-thumb.jpg`;
    const thumbUrl = await uploadBuffer(thumbKey, thumbBuffer, "image/jpeg");

    const dedupeKey = buildStudioDedupeKey(projectId, "VIDEO_TRANSCODE");
    const job = await prisma.agentJob.create({
      data: {
        projectId,
        type: "VIDEO_TRANSCODE",
        status: "QUEUED",
        inputJson: {
          mp4Url: sourceUrl,
          contentType,
          prioritizeMobile: true,
          dedupeKey,
          attempts: 0,
          maxAttempts: Math.max(1, STUDIO_JOB_ATTEMPTS),
          retryable: false
        }
      }
    });

    await prisma.$transaction([
      prisma.studioAsset.update({
        where: { id: pendingAsset.id },
        data: {
          url: sourceUrl,
          storageKey: sourceStorageKey,
          checksum: upload.checksum,
          sizeBytes: upload.sizeBytes,
          size: upload.sizeBytes,
          temporary: false,
          status: "ready",
          finalizedAt: new Date(),
          metaJson: {
            lifecycleState: "ready",
            fileName: fileName ?? "upload.mp4",
            title: title ?? project.title,
            caption: caption ?? project.description ?? "",
            immediateThumbnailKey: thumbKey
          }
        }
      }),
      prisma.studioAsset.create({
        data: {
          projectId,
          jobId: job.id,
          kind: "THUMBNAIL",
          url: thumbUrl,
          storageKey: thumbKey,
          contentType: "image/jpeg",
          status: "ready",
          temporary: false,
          sizeBytes: thumbBuffer.byteLength,
          finalizedAt: new Date(),
          metaJson: {
            lifecycleState: "ready",
            generatedFromUploadId: pendingAsset.uploadId,
            immediate: true
          }
        }
      }),
      prisma.studioProject.update({
        where: { id: projectId },
        data: { status: "PROCESSING", title: title ?? project.title, description: caption ?? project.description ?? null }
      })
    ]);

    await enqueueStudioJob({
      jobId: job.id,
      projectId,
      type: "VIDEO_TRANSCODE",
      input: {
        mp4Url: sourceUrl,
        contentType,
        prioritizeMobile: true
      },
      dedupeKey
    });

    return NextResponse.json({
      ok: true,
      asset: {
        id: pendingAsset.id,
        kind: "VIDEO_UPLOAD",
        url: sourceUrl,
        status: "ready",
        checksum: upload.checksum
      },
      thumbnail: {
        key: thumbKey,
        url: thumbUrl
      },
      job: {
        id: job.id,
        type: "VIDEO_TRANSCODE"
      }
    });
  } catch (error) {
    await prisma.studioAsset.update({
      where: { id: pendingAsset.id },
      data: {
        status: "failed",
        metaJson: {
          lifecycleState: "failed",
          error: error instanceof Error ? error.message : "Upload failed"
        }
      }
    });
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: message === "Checksum mismatch" ? 409 : 400 });
  }
}
