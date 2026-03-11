/**
 * Studio jobs worker.
 * Request/response: consumes Redis queue and writes DB + assets.
 * Guard: requires REDIS_URL, DATABASE_URL, and S3 env vars.
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@illuvrse/db";
import { uploadBuffer } from "@illuvrse/storage";
import { access, readFile, readdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  STUDIO_JOB_ATTEMPTS,
  STUDIO_QUEUE_NAME,
  STUDIO_RETRY_BASE_DELAY_MS,
  enqueueStudioJob,
  getStudioQueue
} from "./index";
import {
  extractClip,
  generateMemePng,
  generateShortSlideshowMp4,
  generateThumbnail,
  transcodeToHls,
  type CaptionStyle,
  type SceneSpec
} from "./render";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

function log(message: string, meta?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      service: "agent-manager",
      ts: new Date().toISOString(),
      level: "info",
      message,
      ...(meta ?? {})
    })
  );
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function downloadToBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function resolveRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    try {
      await access(join(current, "pnpm-workspace.yaml"));
      return current;
    } catch {
      current = join(current, "..");
    }
  }
  return process.cwd();
}

async function loadBrollImages() {
  const root = await resolveRepoRoot();
  const brollDir = join(root, "apps", "web", "public", "studio", "broll");
  const files = await readdir(brollDir);
  const images = files
    .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
    .map((file) => join(brollDir, file));
  if (images.length === 0) {
    const fallback = join(brollDir, "placeholder.png");
    try {
      await access(fallback);
      return [fallback];
    } catch {
      throw new Error("No b-roll images available");
    }
  }
  return images;
}

function normalizeScenes(rawScenes: unknown): SceneSpec[] {
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    return [
      { text: "Signal spike in the control room.", durationMs: 2200 },
      { text: "Crew reroutes power to stabilize the feed.", durationMs: 2200 },
      { text: "The broadcast stabilizes with a twist.", durationMs: 2000 }
    ];
  }
  return rawScenes.map((scene) => {
    const text = typeof scene.text === "string" ? scene.text : "Scene update.";
    const durationMs = Number.isFinite(scene.durationMs) ? Number(scene.durationMs) : 2000;
    const clamped = Math.min(3500, Math.max(1000, durationMs));
    return { text, durationMs: clamped };
  });
}

function resolveCaptionStyle(input: Record<string, unknown>): CaptionStyle {
  const style = (input.style as { captionStyle?: string } | undefined)?.captionStyle ?? input.captionStyle;
  if (style === "impact" || style === "tiktok") return style;
  return "clean";
}

function resolveRenderQuality(input: Record<string, unknown>) {
  const quality = (input.style as { quality?: string } | undefined)?.quality ?? input.quality;
  if (quality === "draft" || quality === "standard" || quality === "high") return quality;
  return process.env.STUDIO_RENDER_QUALITY ?? "high";
}

function estimateNextRetryDelayMs(attempt: number) {
  const base = Math.max(250, STUDIO_RETRY_BASE_DELAY_MS);
  return base * Math.pow(2, Math.max(0, attempt - 1));
}

function getAttemptContext(job: { attemptsMade: number; opts: { attempts?: number } }) {
  const maxAttempts = Math.max(1, Number(job.opts.attempts ?? STUDIO_JOB_ATTEMPTS));
  const attempt = Math.max(1, job.attemptsMade + 1);
  const remainingAttempts = Math.max(0, maxAttempts - attempt);
  return {
    attempt,
    maxAttempts,
    remainingAttempts,
    retryable: remainingAttempts > 0
  };
}

async function upsertAssetRecord(
  projectId: string,
  kind: string,
  url: string,
  metaJson?: Record<string, unknown>
) {
  const existing = await prisma.studioAsset.findFirst({
    where: {
      projectId,
      kind: kind as never,
      url
    },
    select: { id: true }
  });
  if (existing) {
    if (metaJson) {
      await prisma.studioAsset.update({
        where: { id: existing.id },
        data: { metaJson }
      });
    }
    return existing.id;
  }

  const created = await prisma.studioAsset.create({
    data: {
      projectId,
      kind: kind as never,
      url,
      metaJson
    }
  });
  return created.id;
}

async function enqueueFollowupJob(projectId: string, type: string, input: Record<string, unknown>) {
  const jobRecord = await prisma.agentJob.create({
    data: {
      projectId,
      type: type as never,
      status: "QUEUED",
      inputJson: input
    }
  });

  await enqueueStudioJob({
    jobId: jobRecord.id,
    projectId,
    type,
    input
  });

  await prisma.studioProject.update({
    where: { id: projectId },
    data: { status: "PROCESSING" }
  });
}

async function reconcileProjectStatus(projectId: string) {
  const [inflight, failed] = await Promise.all([
    prisma.agentJob.count({
      where: {
        projectId,
        status: { in: ["QUEUED", "PROCESSING"] }
      }
    }),
    prisma.agentJob.count({
      where: {
        projectId,
        status: "FAILED"
      }
    })
  ]);

  const nextStatus = inflight > 0 ? "PROCESSING" : failed > 0 ? "FAILED" : "COMPLETED";
  await prisma.studioProject.update({
    where: { id: projectId },
    data: { status: nextStatus }
  });
}

export const studioWorker = new Worker(
  STUDIO_QUEUE_NAME,
  async (job) => {
    const payload = job.data as {
      jobId: string;
      projectId: string;
      type: string;
      input: Record<string, unknown>;
    };

    const attemptContext = getAttemptContext(job);
    const start = Date.now();
    log("Processing job", {
      type: payload.type,
      jobId: payload.jobId,
      attempt: attemptContext.attempt,
      maxAttempts: attemptContext.maxAttempts
    });

    await prisma.agentJob.update({
      where: { id: payload.jobId },
      data: {
        status: "PROCESSING",
        outputJson: {
          attempts: attemptContext.attempt,
          maxAttempts: attemptContext.maxAttempts,
          startedAt: new Date().toISOString()
        }
      }
    });

    await prisma.studioProject.update({
      where: { id: payload.projectId },
      data: { status: "PROCESSING" }
    });

    let outputJson: Record<string, unknown> | null = null;

    try {
      if (payload.type === "SHORT_SCRIPT") {
        const prompt = (payload.input.prompt as string) ?? "Illuvrse signal";
        const title = (payload.input.title as string) ?? "ILLUVRSE Short";
        outputJson = {
          script: `${title}: ${prompt} The crew reacts, reroutes power, and stabilizes the feed.`
        };
      }

      if (payload.type === "SHORT_SCENES") {
        const prompt = (payload.input.prompt as string) ?? "Illuvrse signal";
        const captionStyle = resolveCaptionStyle(payload.input);
        outputJson = {
          scenes: [
            { text: `Opening beat: ${prompt}.`, durationMs: 2200 },
            { text: "Escalation: alarms flare, crew executes protocol.", durationMs: 2200 },
            { text: "Resolution: feed stabilizes with a twist.", durationMs: 2000 }
          ],
          style: { captionStyle },
          aspect: "9:16"
        };
      }

      if (payload.type === "SHORT_RENDER") {
        const scenes = normalizeScenes(payload.input.scenes);
        const captionStyle = resolveCaptionStyle(payload.input);
        const renderQuality = resolveRenderQuality(payload.input);
        const images = await loadBrollImages();
        const mp4Path = await generateShortSlideshowMp4(scenes, captionStyle, images, renderQuality);
        const mp4Buffer = await readFile(mp4Path);
        const key = `shorts/${payload.projectId}/render.mp4`;
        const mp4Url = await uploadBuffer(key, mp4Buffer, "video/mp4");

        const totalDurationSec = Math.max(
          1,
          Math.round(scenes.reduce((sum, scene) => sum + scene.durationMs, 0) / 1000)
        );

        await upsertAssetRecord(payload.projectId, "SHORT_MP4", mp4Url, {
          durationSec: totalDurationSec,
          captionStyle,
          renderQuality
        });

        outputJson = { mp4Url };

        await enqueueFollowupJob(payload.projectId, "VIDEO_TRANSCODE", { mp4Url });
      }

      if (payload.type === "VIDEO_TRANSCODE") {
        const mp4Url = payload.input.mp4Url as string;
        const mp4Buffer = await downloadToBuffer(mp4Url);
        const tmpFile = join(tmpdir(), `illuvrse-transcode-${Date.now()}.mp4`);
        await writeFile(tmpFile, mp4Buffer);

        const { manifest, dir } = await transcodeToHls(tmpFile);
        const files = await readdir(dir);
        const segmentFiles = files.filter((file) => file.endsWith(".ts"));
        await Promise.all(
          segmentFiles.map(async (file) => {
            const segmentBuffer = await readFile(join(dir, file));
            await uploadBuffer(
              `shorts/${payload.projectId}/${file}`,
              segmentBuffer,
              "video/MP2T"
            );
          })
        );
        const manifestBuffer = await readFile(manifest);
        const manifestKey = `shorts/${payload.projectId}/master.m3u8`;
        const manifestUrl = await uploadBuffer(manifestKey, manifestBuffer, "application/vnd.apple.mpegurl");

        await upsertAssetRecord(payload.projectId, "HLS_MANIFEST", manifestUrl);

        const thumbPath = await generateThumbnail(tmpFile);
        const thumbBuffer = await readFile(thumbPath);
        const thumbUrl = await uploadBuffer(`shorts/${payload.projectId}/thumb.jpg`, thumbBuffer, "image/jpeg");
        await upsertAssetRecord(payload.projectId, "THUMBNAIL", thumbUrl);

        await prisma.shortPost.updateMany({
          where: { projectId: payload.projectId },
          data: { mediaUrl: manifestUrl }
        });

        outputJson = { manifestUrl, thumbUrl };
      }

      if (payload.type === "MEME_CAPTIONS") {
        outputJson = {
          captions: [
            "When the timeline glitches during launch day.",
            "That moment you realize the episode is live.",
            "POV: your render queue just finished.",
            "Me waiting for the GPU to finish.",
            "When the party chat says play it again."
          ]
        };
      }

      if (payload.type === "MEME_RENDER") {
        const baseUrl = payload.input.sourceUrl as string;
        const caption = (payload.input.caption as string) ?? "ILLUVRSE";
        const baseBuffer = await downloadToBuffer(baseUrl);
        const pngBuffer = await generateMemePng(baseBuffer, caption);
        const pngUrl = await uploadBuffer(
          `memes/${payload.projectId}/meme.png`,
          pngBuffer,
          "image/png"
        );

        await upsertAssetRecord(payload.projectId, "MEME_PNG", pngUrl, { caption });

        outputJson = { pngUrl };
      }

      if (payload.type === "VIDEO_CLIP_EXTRACT") {
        const sourceUrl = payload.input.sourceUrl as string;
        const mp4Buffer = await downloadToBuffer(sourceUrl);
        const tmpFile = join(tmpdir(), `illuvrse-clip-source-${Date.now()}.mp4`);
        await writeFile(tmpFile, mp4Buffer);
        const clipPath = await extractClip(tmpFile, 5);
        const clipBuffer = await readFile(clipPath);
        const clipUrl = await uploadBuffer(
          `clips/${payload.projectId}/clip.mp4`,
          clipBuffer,
          "video/mp4"
        );

        await upsertAssetRecord(payload.projectId, "SHORT_MP4", clipUrl, { durationSec: 5 });

        outputJson = { clipUrl };

        await enqueueFollowupJob(payload.projectId, "THUMBNAIL_GENERATE", {
          sourceUrl: clipUrl,
          caption: payload.input.caption ?? "ILLUVRSE"
        });
      }

      if (payload.type === "THUMBNAIL_GENERATE") {
        const sourceUrl = payload.input.sourceUrl as string;
        const caption = (payload.input.caption as string) ?? "ILLUVRSE";
        const mp4Buffer = await downloadToBuffer(sourceUrl);
        const tmpFile = join(tmpdir(), `illuvrse-thumb-source-${Date.now()}.mp4`);
        await writeFile(tmpFile, mp4Buffer);
        const thumbPath = await generateThumbnail(tmpFile);
        const thumbBuffer = await readFile(thumbPath);
        const thumbUrl = await uploadBuffer(
          `memes/${payload.projectId}/thumb.jpg`,
          thumbBuffer,
          "image/jpeg"
        );

        await upsertAssetRecord(payload.projectId, "THUMBNAIL", thumbUrl);

        outputJson = { thumbUrl };

        await enqueueFollowupJob(payload.projectId, "MEME_RENDER", {
          sourceUrl: thumbUrl,
          caption
        });
      }

      const durationMs = Date.now() - start;
      const existingOutput = (await prisma.agentJob.findUnique({
        where: { id: payload.jobId },
        select: { outputJson: true }
      }))?.outputJson;

      await prisma.agentJob.update({
        where: { id: payload.jobId },
        data: {
          status: "COMPLETED",
          outputJson: {
            ...asRecord(existingOutput),
            ...(outputJson ?? {}),
            attempts: attemptContext.attempt,
            maxAttempts: attemptContext.maxAttempts,
            retryable: false,
            durationMs
          },
          error: null
        }
      });

      await reconcileProjectStatus(payload.projectId);

      log("Job completed", {
        jobId: payload.jobId,
        durationMs,
        attempt: attemptContext.attempt,
        type: payload.type
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const existingOutput = (await prisma.agentJob.findUnique({
        where: { id: payload.jobId },
        select: { outputJson: true }
      }))?.outputJson;
      const retryDelayMs = estimateNextRetryDelayMs(attemptContext.attempt);
      const retryAtIso = new Date(Date.now() + retryDelayMs).toISOString();

      if (attemptContext.retryable) {
        log("Job attempt failed, retrying", {
          jobId: payload.jobId,
          type: payload.type,
          error: message,
          attempt: attemptContext.attempt,
          nextRetryInMs: retryDelayMs
        });
        await prisma.agentJob.update({
          where: { id: payload.jobId },
          data: {
            status: "QUEUED",
            error: message,
            outputJson: {
              ...asRecord(existingOutput),
              attempts: attemptContext.attempt,
              maxAttempts: attemptContext.maxAttempts,
              retryable: true,
              nextRetryInMs: retryDelayMs,
              nextRetryAt: retryAtIso,
              lastError: message
            }
          }
        });
        await prisma.studioProject.update({
          where: { id: payload.projectId },
          data: { status: "PROCESSING" }
        });
      } else {
        log("Job failed permanently", {
          jobId: payload.jobId,
          type: payload.type,
          error: message,
          attempt: attemptContext.attempt
        });
        await prisma.agentJob.update({
          where: { id: payload.jobId },
          data: {
            status: "FAILED",
            error: message,
            outputJson: {
              ...asRecord(existingOutput),
              attempts: attemptContext.attempt,
              maxAttempts: attemptContext.maxAttempts,
              retryable: false,
              lastError: message
            }
          }
        });
        await prisma.studioProject.update({
          where: { id: payload.projectId },
          data: { status: "FAILED" }
        });
      }
      throw error;
    }
  },
  {
    connection,
    concurrency: Math.max(1, Number(process.env.STUDIO_WORKER_CONCURRENCY ?? "2")),
    lockDuration: Math.max(30_000, Number(process.env.STUDIO_WORKER_LOCK_MS ?? "120000")),
    maxStalledCount: Math.max(1, Number(process.env.STUDIO_WORKER_MAX_STALLED ?? "2"))
  }
);

studioWorker.on("failed", (job, err) => {
  log("Worker job failed", { jobId: job?.id, error: err.message });
});

setInterval(async () => {
  try {
    const queue = getStudioQueue();
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    log("Queue heartbeat", { counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown queue heartbeat error";
    log("Queue heartbeat failed", { error: message });
  }
}, 60_000);
