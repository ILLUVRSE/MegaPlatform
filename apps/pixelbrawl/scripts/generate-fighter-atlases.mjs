import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FIGHTERS_ROOT = path.resolve("src/assets/fighters");
const FRAME_W = 80;
const FRAME_H = 110;
const PORTRAIT = 96;
const FPS = 8;
const ANIM_KEYS = [
  "idle",
  "walk",
  "crouch",
  "jump",
  "hit",
  "block",
  "attack_hit",
  "attack_kick",
  "attack_power",
  "knockdown",
  "ko"
];

const isPng = (name) => name.toLowerCase().endsWith(".png");

const pickSourceImage = (fighterDir) => {
  const files = fs.readdirSync(fighterDir, { withFileTypes: true });
  const candidates = files
    .filter((d) => d.isFile() && isPng(d.name))
    .map((d) => d.name)
    .filter((name) => !["atlas.png", "sheet.png"].includes(name.toLowerCase()));

  if (!candidates.length) return null;

  const scored = candidates.map((name) => {
    const full = path.join(fighterDir, name);
    const st = fs.statSync(full);
    const hasImageWord = /image|ref|concept|source/i.test(name) ? 1 : 0;
    return { name, full, size: st.size, hasImageWord };
  });

  scored.sort((a, b) => {
    if (b.hasImageWord !== a.hasImageWord) return b.hasImageWord - a.hasImageWord;
    return b.size - a.size;
  });

  return scored[0].full;
};

const buildAtlasJson = () => {
  const frames = {
    idle: { frame: { x: 0, y: 0, w: FRAME_W, h: FRAME_H } }
  };
  const animations = {};
  ANIM_KEYS.forEach((key) => {
    animations[key] = { frames: ["idle"], fps: FPS };
  });
  return { frames, animations, meta: { generated: true } };
};

const ensureFfmpeg = () => {
  const check = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (check.status !== 0) {
    console.error("ffmpeg is required but was not found in PATH.");
    process.exit(1);
  }
};

const detectCrop = (srcPath) => {
  const vf = "colorkey=0xF6F6F6:0.2:0.08,format=rgba,alphaextract,cropdetect=20:4:0";
  const res = spawnSync("ffmpeg", ["-v", "info", "-i", srcPath, "-vf", vf, "-f", "null", "-"], {
    encoding: "utf8"
  });
  const text = `${res.stdout || ""}\n${res.stderr || ""}`;
  const matches = [...text.matchAll(/crop=([0-9]+:[0-9]+:[0-9]+:[0-9]+)/g)];
  if (!matches.length) return null;
  return matches[matches.length - 1][1];
};

const renderPng = (srcPath, outPath) => {
  const crop = detectCrop(srcPath);
  const vf = [
    // Remove near-white matte backgrounds from imported concept art.
    "colorkey=0xF6F6F6:0.2:0.08",
    ...(crop ? [`crop=${crop}`] : []),
    `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease`,
    `pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
    "unsharp=3:3:0.5",
    "format=rgba"
  ].join(",");

  const args = ["-y", "-i", srcPath, "-vf", vf, "-frames:v", "1", outPath];
  const res = spawnSync("ffmpeg", args, { stdio: "ignore" });
  return res.status === 0;
};

const renderPortrait = (srcPath, outPath) => {
  const crop = detectCrop(srcPath);
  const vf = [
    "colorkey=0xF6F6F6:0.2:0.08",
    ...(crop ? [`crop=${crop}`] : []),
    `scale=${PORTRAIT}:${PORTRAIT}:force_original_aspect_ratio=decrease`,
    `pad=${PORTRAIT}:${PORTRAIT}:(ow-iw)/2:(oh-ih)/2:color=0x0B1026@1`,
    "format=rgba"
  ].join(",");
  const args = ["-y", "-i", srcPath, "-vf", vf, "-frames:v", "1", outPath];
  const res = spawnSync("ffmpeg", args, { stdio: "ignore" });
  return res.status === 0;
};

const main = () => {
  ensureFfmpeg();

  if (!fs.existsSync(FIGHTERS_ROOT)) {
    console.error(`Missing fighters folder: ${FIGHTERS_ROOT}`);
    process.exit(1);
  }

  const fighterDirs = fs
    .readdirSync(FIGHTERS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(FIGHTERS_ROOT, d.name));

  let generated = 0;
  let skipped = 0;

  fighterDirs.forEach((fighterDir) => {
    const src = pickSourceImage(fighterDir);
    if (!src) {
      skipped += 1;
      return;
    }

    const atlasPath = path.join(fighterDir, "atlas.png");
    const jsonPath = path.join(fighterDir, "atlas.json");
    const portraitPath = path.join(fighterDir, "portrait.png");

    const ok = renderPng(src, atlasPath);
    if (!ok) {
      console.error(`Failed to render atlas for ${fighterDir}`);
      return;
    }
    renderPortrait(src, portraitPath);

    const json = buildAtlasJson();
    fs.writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    generated += 1;
    console.log(`${path.basename(fighterDir)}: ${path.basename(src)} -> atlas.png/json`);
  });

  console.log(`Generated: ${generated}, Skipped (no PNG source): ${skipped}`);
};

main();
