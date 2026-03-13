/**
 * Rendering helpers for the agent manager.
 * Request/response: provides ffmpeg + image composition utilities.
 * Guard: server-side only; requires ffmpeg in PATH for video helpers.
 */
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";

export type CaptionStyle = "clean" | "impact" | "tiktok";
export type SceneSpec = { text: string; durationMs: number };
export type RenderQuality = "draft" | "standard" | "high";
export type MobileFastPassVariant = {
  name: "mobile-360" | "mobile-540";
  width: number;
  height: number;
  outputPath: string;
  contentType: "video/mp4";
};

type RenderPreset = {
  crf: string;
  preset: string;
  bitrate: string;
  maxrate: string;
  bufsize: string;
};

type TranscodeContentProfile = {
  preset: string;
  crf: string;
  audioBitrate: string;
};

const RENDER_PRESETS: Record<RenderQuality, RenderPreset> = {
  draft: {
    crf: "24",
    preset: "veryfast",
    bitrate: "2600k",
    maxrate: "3400k",
    bufsize: "5200k"
  },
  standard: {
    crf: "21",
    preset: "faster",
    bitrate: "3600k",
    maxrate: "4600k",
    bufsize: "7200k"
  },
  high: {
    crf: "18",
    preset: "medium",
    bitrate: "5200k",
    maxrate: "6800k",
    bufsize: "9800k"
  }
};

const TRANSCODE_CONTENT_PROFILES: Record<string, TranscodeContentProfile> = {
  "video/mp4": {
    preset: "faster",
    crf: "21",
    audioBitrate: "128k"
  },
  "video/quicktime": {
    preset: "fast",
    crf: "22",
    audioBitrate: "128k"
  },
  "video/webm": {
    preset: "veryfast",
    crf: "24",
    audioBitrate: "96k"
  },
  default: {
    preset: "faster",
    crf: "21",
    audioBitrate: "128k"
  }
};

function resolveRenderQuality(requested?: string): RenderQuality {
  if (requested === "draft" || requested === "standard" || requested === "high") return requested;
  const envDefault = process.env.STUDIO_RENDER_QUALITY;
  if (envDefault === "draft" || envDefault === "standard" || envDefault === "high") return envDefault;
  return "high";
}

export function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}`));
    });
  });
}

export function escapeDrawtext(input: string) {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/\n/g, "\\n");
}

export function wrapText(input: string, maxChars = 28) {
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}

function buildCaptionFilter(style: CaptionStyle, text: string) {
  const escaped = escapeDrawtext(text);
  if (style === "impact") {
    return `drawtext=text='${escaped}':fontcolor=white:fontsize=72:borderw=4:bordercolor=black:x=(w-text_w)/2:y=60:line_spacing=8`;
  }
  if (style === "tiktok") {
    return `drawtext=text='${escaped}':fontcolor=white:fontsize=56:borderw=6:bordercolor=black:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-(text_h*2.2):line_spacing=6`;
  }
  return `drawtext=text='${escaped}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.45:boxborderw=24:x=(w-text_w)/2:y=h-(text_h*2.6):line_spacing=6`;
}

export function buildSlideshowFilter(
  scenes: SceneSpec[],
  captionStyle: CaptionStyle
) {
  const filters: string[] = [];
  const transition = 0.35;

  scenes.forEach((scene, index) => {
    const wrapped = wrapText(scene.text, captionStyle === "impact" ? 20 : 28);
    const draw = buildCaptionFilter(captionStyle, wrapped);
    filters.push(
      `[${index}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${draw},format=yuv420p,setsar=1,setpts=PTS-STARTPTS[v${index}]`
    );
  });

  if (scenes.length === 1) {
    return { filter: filters.join(";"), outputLabel: "v0" };
  }

  let current = "v0";
  let cumulative = scenes[0].durationMs / 1000;

  for (let i = 1; i < scenes.length; i += 1) {
    const next = `v${i}`;
    const out = `x${i}`;
    const offset = Math.max(0, cumulative - transition);
    filters.push(
      `[${current}][${next}]xfade=transition=fade:duration=${transition}:offset=${offset}[${out}]`
    );
    cumulative += scenes[i].durationMs / 1000 - transition;
    current = out;
  }

  return { filter: filters.join(";"), outputLabel: current };
}

export async function generateShortSlideshowMp4(
  scenes: SceneSpec[],
  captionStyle: CaptionStyle,
  imagePaths: string[],
  renderQuality?: string
) {
  const dir = join(tmpdir(), `illuvrse-short-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  const output = join(dir, "render.mp4");
  const { filter, outputLabel } = buildSlideshowFilter(scenes, captionStyle);
  const quality = RENDER_PRESETS[resolveRenderQuality(renderQuality)];
  const inputs: string[] = [];
  scenes.forEach((scene, index) => {
    const durationSec = Math.max(1, Math.min(3.5, scene.durationMs / 1000));
    const imagePath = imagePaths[index % imagePaths.length];
    inputs.push("-loop", "1", "-t", durationSec.toString(), "-i", imagePath);
  });

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    `[${outputLabel}]`,
    "-profile:v",
    "high",
    "-level:v",
    "4.1",
    "-codec:v",
    "libx264",
    "-preset",
    quality.preset,
    "-crf",
    quality.crf,
    "-b:v",
    quality.bitrate,
    "-maxrate",
    quality.maxrate,
    "-bufsize",
    quality.bufsize,
    "-g",
    "60",
    "-keyint_min",
    "60",
    "-sc_threshold",
    "0",
    "-r",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output
  ]);

  return output;
}

export async function transcodeToHls(inputPath: string) {
  const dir = join(tmpdir(), `illuvrse-hls-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  const manifest = join(dir, "master.m3u8");
  const segmentPattern = join(dir, "segment-%03d.ts");

  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=720:1280:flags=lanczos:force_original_aspect_ratio=increase,crop=720:1280",
    "-codec:v",
    "libx264",
    "-preset",
    "faster",
    "-crf",
    "21",
    "-profile:v",
    "main",
    "-level:v",
    "4.0",
    "-codec:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-hls_flags",
    "independent_segments",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    segmentPattern,
    manifest
  ]);

  return { manifest, dir };
}

export async function generateMobileFastPasses(
  inputPath: string,
  options?: {
    contentType?: string;
    prioritizeMobile?: boolean;
  }
) {
  if (options?.prioritizeMobile === false) return [];

  const dir = join(tmpdir(), `illuvrse-fastpass-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  const profile = TRANSCODE_CONTENT_PROFILES[options?.contentType ?? ""] ?? TRANSCODE_CONTENT_PROFILES.default;
  const variants: Omit<MobileFastPassVariant, "outputPath" | "contentType">[] = [
    { name: "mobile-360", width: 360, height: 640 },
    { name: "mobile-540", width: 540, height: 960 }
  ];

  const outputs: MobileFastPassVariant[] = [];
  for (const variant of variants) {
    const outputPath = join(dir, `${variant.name}.mp4`);
    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vf",
      `scale=${variant.width}:${variant.height}:flags=lanczos:force_original_aspect_ratio=increase,crop=${variant.width}:${variant.height}`,
      "-codec:v",
      "libx264",
      "-preset",
      profile.preset,
      "-crf",
      profile.crf,
      "-movflags",
      "+faststart",
      "-codec:a",
      "aac",
      "-b:a",
      profile.audioBitrate,
      "-ar",
      "48000",
      outputPath
    ]);
    outputs.push({
      ...variant,
      outputPath,
      contentType: "video/mp4"
    });
  }

  return outputs;
}

export async function generateThumbnail(inputPath: string) {
  const output = join(tmpdir(), `illuvrse-thumb-${Date.now()}.jpg`);
  await runFfmpeg(["-y", "-ss", "1", "-i", inputPath, "-vf", "scale=540:-1:flags=lanczos", "-q:v", "2", "-vframes", "1", output]);
  return output;
}

export async function generateMemePng(baseBuffer: Buffer, caption: string) {
  const safeCaption = caption
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const svg = `
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <style>
        .caption { font: 48px Impact, sans-serif; fill: white; stroke: black; stroke-width: 2px; }
      </style>
      <text x="50%" y="12%" text-anchor="middle" class="caption">${safeCaption}</text>
    </svg>
  `;

  const image = await sharp(baseBuffer)
    .resize(800, 800, { fit: "cover" })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  return image;
}

export async function extractClip(inputPath: string, durationSec = 5) {
  const output = join(tmpdir(), `illuvrse-clip-${Date.now()}.mp4`);
  await runFfmpeg([
    "-y",
    "-ss",
    "0",
    "-t",
    String(durationSec),
    "-i",
    inputPath,
    "-vf",
    "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
    "-codec:v",
    "libx264",
    output
  ]);
  return output;
}
