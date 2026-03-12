import { access, readFile, readdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { prisma } from "@illuvrse/db";
import { uploadBuffer } from "@illuvrse/storage";
import {
  buildStudioDedupeKey,
  calculateStudioRetryDelayMs,
  enqueueStudioJob,
  STUDIO_JOB_ATTEMPTS
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

export type StudioWorkerJob = {
  id?: string | null;
  data: {
    jobId: string;
    projectId: string;
    type: string;
    input: Record<string, unknown>;
    dedupeKey?: string;
  };
  attemptsMade: number;
  opts: { attempts?: number };
};

type StudioWorkerDeps = {
  prisma: typeof prisma;
  uploadBuffer: typeof uploadBuffer;
  access: typeof access;
  readFile: typeof readFile;
  readdir: typeof readdir;
  writeFile: typeof writeFile;
  tmpdir: typeof tmpdir;
  join: typeof join;
  fetch: typeof fetch;
  loadBrollImages: typeof loadBrollImages;
  generateShortSlideshowMp4: typeof generateShortSlideshowMp4;
  transcodeToHls: typeof transcodeToHls;
  generateThumbnail: typeof generateThumbnail;
  generateMemePng: typeof generateMemePng;
  extractClip: typeof extractClip;
  enqueueStudioJob: typeof enqueueStudioJob;
  now: () => number;
};

export const defaultStudioWorkerDeps: StudioWorkerDeps = {
  prisma,
  uploadBuffer,
  access,
  readFile,
  readdir,
  writeFile,
  tmpdir,
  join,
  fetch,
  loadBrollImages,
  generateShortSlideshowMp4,
  transcodeToHls,
  generateThumbnail,
  generateMemePng,
  extractClip,
  enqueueStudioJob,
  now: () => Date.now()
};

export function logStudioWorker(message: string, meta?: Record<string, unknown>) {
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

async function downloadToBuffer(url: string, deps: StudioWorkerDeps) {
  const response = await deps.fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function resolveRepoRoot() {
  let current = process.cwd();
  for (let index = 0; index < 6; index += 1) {
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

function getAttemptContext(job: StudioWorkerJob) {
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
  deps: StudioWorkerDeps,
  input: {
    projectId: string;
    jobId: string;
    jobType: string;
    kind: string;
    url: string;
    storageKey?: string;
    metaJson?: Record<string, unknown>;
  }
) {
  const existing = await deps.prisma.studioAsset.findFirst({
    where: {
      projectId: input.projectId,
      kind: input.kind as never,
      storageKey: input.storageKey ?? undefined
    },
    select: { id: true }
  });

  if (existing) {
    return deps.prisma.studioAsset.update({
      where: { id: existing.id },
      data: {
        jobId: input.jobId,
        kind: input.kind as never,
        url: input.url,
        storageKey: input.storageKey,
        metaJson: {
          ...(input.metaJson ?? {}),
          jobType: input.jobType
        },
        status: "ready",
        finalizedAt: new Date()
      }
    });
  }

  return deps.prisma.studioAsset.create({
    data: {
      projectId: input.projectId,
      jobId: input.jobId,
      kind: input.kind as never,
      url: input.url,
      storageKey: input.storageKey,
      metaJson: {
        ...(input.metaJson ?? {}),
        jobType: input.jobType
      },
      status: "ready",
      finalizedAt: new Date()
    }
  });
}

async function enqueueFollowupJob(
  deps: StudioWorkerDeps,
  projectId: string,
  type: string,
  input: Record<string, unknown>
) {
  const dedupeKey = buildStudioDedupeKey(projectId, type);
  const jobRecord = await deps.prisma.agentJob.create({
    data: {
      projectId,
      type: type as never,
      status: "QUEUED",
      inputJson: {
        ...input,
        dedupeKey,
        attempts: 0,
        maxAttempts: Math.max(1, STUDIO_JOB_ATTEMPTS),
        retryable: false
      }
    }
  });

  await deps.enqueueStudioJob({
    jobId: jobRecord.id,
    projectId,
    type,
    input,
    dedupeKey
  });

  await deps.prisma.studioProject.update({
    where: { id: projectId },
    data: { status: "PROCESSING" }
  });
}

async function reconcileProjectStatus(deps: StudioWorkerDeps, projectId: string) {
  const [inflight, failed] = await Promise.all([
    deps.prisma.agentJob.count({
      where: {
        projectId,
        status: { in: ["QUEUED", "PROCESSING"] }
      }
    }),
    deps.prisma.agentJob.count({
      where: {
        projectId,
        status: "FAILED"
      }
    })
  ]);

  const nextStatus = inflight > 0 ? "PROCESSING" : failed > 0 ? "FAILED" : "COMPLETED";
  await deps.prisma.studioProject.update({
    where: { id: projectId },
    data: { status: nextStatus }
  });
}

export async function processStudioJob(
  job: StudioWorkerJob,
  deps: StudioWorkerDeps = defaultStudioWorkerDeps,
  log: typeof logStudioWorker = logStudioWorker
) {
  const payload = job.data;
  const attemptContext = getAttemptContext(job);
  const startedAt = new Date().toISOString();
  const startedMs = deps.now();

  log("Processing job", {
    type: payload.type,
    jobId: payload.jobId,
    attempt: attemptContext.attempt,
    maxAttempts: attemptContext.maxAttempts,
    dedupeKey: payload.dedupeKey ?? buildStudioDedupeKey(payload.projectId, payload.type)
  });

  await deps.prisma.agentJob.update({
    where: { id: payload.jobId },
    data: {
      status: "PROCESSING",
      outputJson: {
        attempts: attemptContext.attempt,
        maxAttempts: attemptContext.maxAttempts,
        retryable: attemptContext.retryable,
        startedAt
      }
    }
  });

  await deps.prisma.studioProject.update({
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
      const images = await deps.loadBrollImages();
      const mp4Path = await deps.generateShortSlideshowMp4(scenes, captionStyle, images, renderQuality);
      const mp4Buffer = await deps.readFile(mp4Path);
      const storageKey = `shorts/${payload.projectId}/render.mp4`;
      const mp4Url = await deps.uploadBuffer(storageKey, mp4Buffer, "video/mp4");

      const totalDurationSec = Math.max(
        1,
        Math.round(scenes.reduce((sum, scene) => sum + scene.durationMs, 0) / 1000)
      );

      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "SHORT_MP4",
        url: mp4Url,
        storageKey,
        metaJson: {
          durationSec: totalDurationSec,
          captionStyle,
          renderQuality,
          outputKind: "SHORT_MP4"
        }
      });

      outputJson = { mp4Url };

      await enqueueFollowupJob(deps, payload.projectId, "VIDEO_TRANSCODE", { mp4Url });
    }

    if (payload.type === "VIDEO_TRANSCODE") {
      const mp4Url = payload.input.mp4Url as string;
      const mp4Buffer = await downloadToBuffer(mp4Url, deps);
      const tmpFile = deps.join(deps.tmpdir(), `illuvrse-transcode-${deps.now()}.mp4`);
      await deps.writeFile(tmpFile, mp4Buffer);

      const { manifest, dir } = await deps.transcodeToHls(tmpFile);
      const files = await deps.readdir(dir);
      const segmentFiles = files.filter((file) => file.endsWith(".ts"));
      await Promise.all(
        segmentFiles.map(async (file) => {
          const segmentBuffer = await deps.readFile(deps.join(dir, file));
          await deps.uploadBuffer(`shorts/${payload.projectId}/${file}`, segmentBuffer, "video/MP2T");
        })
      );
      const manifestBuffer = await deps.readFile(manifest);
      const manifestKey = `shorts/${payload.projectId}/master.m3u8`;
      const manifestUrl = await deps.uploadBuffer(manifestKey, manifestBuffer, "application/vnd.apple.mpegurl");

      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "HLS_MANIFEST",
        url: manifestUrl,
        storageKey: manifestKey,
        metaJson: { outputKind: "HLS_MANIFEST" }
      });

      const thumbPath = await deps.generateThumbnail(tmpFile);
      const thumbBuffer = await deps.readFile(thumbPath);
      const thumbKey = `shorts/${payload.projectId}/thumb.jpg`;
      const thumbUrl = await deps.uploadBuffer(thumbKey, thumbBuffer, "image/jpeg");
      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "THUMBNAIL",
        url: thumbUrl,
        storageKey: thumbKey,
        metaJson: { outputKind: "THUMBNAIL" }
      });

      await deps.prisma.shortPost.updateMany({
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
      const baseBuffer = await downloadToBuffer(baseUrl, deps);
      const pngBuffer = await deps.generateMemePng(baseBuffer, caption);
      const storageKey = `memes/${payload.projectId}/meme.png`;
      const pngUrl = await deps.uploadBuffer(storageKey, pngBuffer, "image/png");

      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "MEME_PNG",
        url: pngUrl,
        storageKey,
        metaJson: { caption, outputKind: "MEME_PNG" }
      });

      outputJson = { pngUrl };
    }

    if (payload.type === "VIDEO_CLIP_EXTRACT") {
      const sourceUrl = payload.input.sourceUrl as string;
      const mp4Buffer = await downloadToBuffer(sourceUrl, deps);
      const tmpFile = deps.join(deps.tmpdir(), `illuvrse-clip-source-${deps.now()}.mp4`);
      await deps.writeFile(tmpFile, mp4Buffer);
      const clipPath = await deps.extractClip(tmpFile, 5);
      const clipBuffer = await deps.readFile(clipPath);
      const storageKey = `clips/${payload.projectId}/clip.mp4`;
      const clipUrl = await deps.uploadBuffer(storageKey, clipBuffer, "video/mp4");

      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "SHORT_MP4",
        url: clipUrl,
        storageKey,
        metaJson: { durationSec: 5, outputKind: "SHORT_MP4" }
      });

      outputJson = { clipUrl };

      await enqueueFollowupJob(deps, payload.projectId, "THUMBNAIL_GENERATE", {
        sourceUrl: clipUrl,
        caption: payload.input.caption ?? "ILLUVRSE"
      });
    }

    if (payload.type === "THUMBNAIL_GENERATE") {
      const sourceUrl = payload.input.sourceUrl as string;
      const caption = (payload.input.caption as string) ?? "ILLUVRSE";
      const mp4Buffer = await downloadToBuffer(sourceUrl, deps);
      const tmpFile = deps.join(deps.tmpdir(), `illuvrse-thumb-source-${deps.now()}.mp4`);
      await deps.writeFile(tmpFile, mp4Buffer);
      const thumbPath = await deps.generateThumbnail(tmpFile);
      const thumbBuffer = await deps.readFile(thumbPath);
      const storageKey = `memes/${payload.projectId}/thumb.jpg`;
      const thumbUrl = await deps.uploadBuffer(storageKey, thumbBuffer, "image/jpeg");

      await upsertAssetRecord(deps, {
        projectId: payload.projectId,
        jobId: payload.jobId,
        jobType: payload.type,
        kind: "THUMBNAIL",
        url: thumbUrl,
        storageKey,
        metaJson: { outputKind: "THUMBNAIL" }
      });

      outputJson = { thumbUrl };

      await enqueueFollowupJob(deps, payload.projectId, "MEME_RENDER", {
        sourceUrl: thumbUrl,
        caption
      });
    }

    const durationMs = deps.now() - startedMs;
    const existingOutput = (await deps.prisma.agentJob.findUnique({
      where: { id: payload.jobId },
      select: { outputJson: true }
    }))?.outputJson;

    await deps.prisma.agentJob.update({
      where: { id: payload.jobId },
      data: {
        status: "COMPLETED",
        error: null,
        outputJson: {
          ...asRecord(existingOutput),
          ...(outputJson ?? {}),
          attempts: attemptContext.attempt,
          maxAttempts: attemptContext.maxAttempts,
          retryable: false,
          lastError: null,
          durationMs
        }
      }
    });

    await reconcileProjectStatus(deps, payload.projectId);

    log("Job completed", {
      jobId: payload.jobId,
      durationMs,
      attempt: attemptContext.attempt,
      type: payload.type
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const existingOutput = (await deps.prisma.agentJob.findUnique({
      where: { id: payload.jobId },
      select: { outputJson: true }
    }))?.outputJson;
    const retryDelayMs = calculateStudioRetryDelayMs({
      attempt: attemptContext.attempt,
      jobId: payload.jobId
    });
    const retryAtIso = new Date(deps.now() + retryDelayMs).toISOString();

    if (attemptContext.retryable) {
      log("Job attempt failed, retrying", {
        jobId: payload.jobId,
        type: payload.type,
        error: message,
        attempt: attemptContext.attempt,
        nextRetryInMs: retryDelayMs
      });
      await deps.prisma.agentJob.update({
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
      await deps.prisma.studioProject.update({
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
      await deps.prisma.agentJob.update({
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
      await deps.prisma.studioProject.update({
        where: { id: payload.projectId },
        data: { status: "FAILED" }
      });
    }
    throw error;
  }
}
