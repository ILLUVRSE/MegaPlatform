import { RosterManager } from "../engine/roster/RosterManager.js";

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

const DEFAULT_FPS = 8;
const PLACEHOLDER_FIGHTERS = new Set(["byte", "vex", "glitch", "brick"]);
const TUNING_STORAGE_KEY = "pixelbrawl_fighter_tuning";
const NORMALIZED_W = 96;
const NORMALIZED_H = 128;
const BASELINE_Y = 118;
const TARGET_BODY_H = 98;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
};

const toAssetCandidates = (inputPath) => {
  const raw = String(inputPath || "");
  if (!raw) return [];
  const out = new Set([raw, encodeURI(raw)]);
  if (!raw.startsWith("/") && !/^https?:\/\//i.test(raw)) {
    out.add(`/${raw}`);
    out.add(`/${encodeURI(raw)}`);
  }
  if (raw.startsWith("src/")) {
    const stripped = raw.replace(/^src\//, "");
    out.add(stripped);
    out.add(encodeURI(stripped));
    out.add(`/${raw}`);
    out.add(`/${encodeURI(raw)}`);
    out.add(`/${stripped}`);
    out.add(`/${encodeURI(stripped)}`);
  }
  return Array.from(out);
};

const fetchJsonWithFallback = async (path) => {
  const candidates = toAssetCandidates(path);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const data = await fetchJson(candidate);
    if (data) return { data, url: candidate };
  }
  return null;
};

const loadImageWithFallback = async (path) => {
  const candidates = toAssetCandidates(path);
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const img = await loadImage(candidate);
      return { img, url: candidate };
    } catch {
      // try next
    }
  }
  return null;
};

const createPlaceholderSheet = () => {
  const frameW = 80;
  const frameH = 110;
  const cols = 6;
  const rows = Math.ceil(ANIM_KEYS.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * frameW;
  canvas.height = rows * frameH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  ANIM_KEYS.forEach((key, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const ox = col * frameW;
    const oy = row * frameH;

    ctx.fillStyle = "#0f142b";
    ctx.fillRect(ox + 18, oy + 32, 44, 54);
    ctx.fillStyle = "#6de5ff";
    ctx.fillRect(ox + 22, oy + 36, 36, 46);

    ctx.fillStyle = "#ff8bc2";
    ctx.fillRect(ox + 30, oy + 16, 20, 20);

    if (key.startsWith("attack")) {
      ctx.fillStyle = "#6de5ff";
      ctx.fillRect(ox + 58, oy + 46, 18, 8);
    } else {
      ctx.fillStyle = "#6de5ff";
      ctx.fillRect(ox + 58, oy + 46, 10, 8);
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.strokeRect(ox + 18, oy + 32, 44, 54);
  });

  const frames = {};
  const animations = {};
  ANIM_KEYS.forEach((key, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    frames[key] = { frame: { x: col * frameW, y: row * frameH, w: frameW, h: frameH } };
    animations[key] = { frames: [key], fps: DEFAULT_FPS };
  });

  return {
    image: canvas,
    frames,
    animations,
    config: { anchorX: 0.5, anchorY: 1, scale: 1, offsetX: 0, offsetY: 0 }
  };
};

const readTuningMap = () => {
  try {
    const raw = localStorage.getItem(TUNING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeTuningMap = (map) => {
  try {
    localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
};

const findOpaqueBounds = (img) => {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height).data;

  let minX = c.width;
  let minY = c.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < c.height; y += 1) {
    for (let xPos = 0; xPos < c.width; xPos += 1) {
      const a = data[(y * c.width + xPos) * 4 + 3];
      if (a > 12) {
        if (xPos < minX) minX = xPos;
        if (y < minY) minY = y;
        if (xPos > maxX) maxX = xPos;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
};

const normalizeSprite = (img, tune = {}) => {
  const bounds = findOpaqueBounds(img);
  const crop = document.createElement("canvas");
  crop.width = bounds.w;
  crop.height = bounds.h;
  const cropCtx = crop.getContext("2d");
  cropCtx.imageSmoothingEnabled = false;
  cropCtx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);

  const out = document.createElement("canvas");
  out.width = NORMALIZED_W;
  out.height = NORMALIZED_H;
  const outCtx = out.getContext("2d");
  outCtx.imageSmoothingEnabled = false;

  const scaleMul = Number(tune.scale || 1);
  const targetH = TARGET_BODY_H * scaleMul;
  const drawScale = targetH / Math.max(1, bounds.h);
  const dw = Math.round(bounds.w * drawScale);
  const dh = Math.round(bounds.h * drawScale);
  const dx = Math.round((NORMALIZED_W - dw) * 0.5 + Number(tune.offsetX || 0));
  const dy = Math.round(BASELINE_Y - dh + Number(tune.offsetY || 0));

  outCtx.drawImage(crop, dx, dy, dw, dh);
  return out;
};

const frameFromCanvas = (canvas) => ({ frame: { x: 0, y: 0, w: canvas.width, h: canvas.height } });

const makePoseFrame = (base, opts = {}) => {
  const c = document.createElement("canvas");
  c.width = base.width;
  c.height = base.height;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;

  const sx = opts.scaleX ?? 1;
  const sy = opts.scaleY ?? 1;
  const ox = opts.offsetX ?? 0;
  const oy = opts.offsetY ?? 0;

  x.save();
  x.translate(c.width * 0.5 + ox, BASELINE_Y + oy);
  x.scale(sx, sy);
  x.drawImage(base, -base.width * 0.5, -BASELINE_Y);
  x.restore();
  return c;
};

const buildGeneratedSheet = (baseCanvas) => {
  const framesByName = [
    ["idle_0", makePoseFrame(baseCanvas, { offsetY: 0 })],
    ["idle_1", makePoseFrame(baseCanvas, { offsetY: -1, scaleY: 1.01 })],
    ["idle_2", makePoseFrame(baseCanvas, { offsetY: 0 })],
    ["idle_3", makePoseFrame(baseCanvas, { offsetY: 1, scaleY: 0.995 })],
    ["walk_0", makePoseFrame(baseCanvas, { offsetX: -1, offsetY: 0 })],
    ["walk_1", makePoseFrame(baseCanvas, { offsetX: 1, offsetY: -1 })],
    ["walk_2", makePoseFrame(baseCanvas, { offsetX: -1, offsetY: 0 })],
    ["walk_3", makePoseFrame(baseCanvas, { offsetX: 1, offsetY: 1 })],
    ["crouch_0", makePoseFrame(baseCanvas, { scaleY: 0.92, offsetY: 6 })],
    ["jump_0", makePoseFrame(baseCanvas, { offsetY: -12 })],
    ["hit_0", makePoseFrame(baseCanvas, { offsetX: -3, scaleX: 0.98, scaleY: 0.98 })],
    ["block_0", makePoseFrame(baseCanvas, { scaleX: 0.96, offsetX: -2 })],
    ["attack_hit_0", makePoseFrame(baseCanvas, { offsetX: 4 })],
    ["attack_kick_0", makePoseFrame(baseCanvas, { offsetX: 5, offsetY: -1 })],
    ["attack_power_0", makePoseFrame(baseCanvas, { offsetX: 6, scaleX: 1.02 })],
    ["knockdown_0", makePoseFrame(baseCanvas, { scaleY: 0.82, offsetY: 10 })],
    ["ko_0", makePoseFrame(baseCanvas, { scaleY: 0.78, offsetY: 13 })]
  ];

  const frameW = baseCanvas.width;
  const frameH = baseCanvas.height;
  const cols = 6;
  const rows = Math.ceil(framesByName.length / cols);
  const sheet = document.createElement("canvas");
  sheet.width = cols * frameW;
  sheet.height = rows * frameH;
  const sctx = sheet.getContext("2d");
  sctx.imageSmoothingEnabled = false;

  const frames = {};
  framesByName.forEach(([name, c], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * frameW;
    const y = row * frameH;
    sctx.drawImage(c, x, y);
    frames[name] = { frame: { x, y, w: frameW, h: frameH } };
  });

  const animations = {
    idle: { frames: ["idle_0", "idle_1", "idle_2", "idle_3"], fps: 7 },
    walk: { frames: ["walk_0", "walk_1", "walk_2", "walk_3"], fps: 9 },
    crouch: { frames: ["crouch_0"], fps: 6 },
    jump: { frames: ["jump_0"], fps: 6 },
    hit: { frames: ["hit_0"], fps: 10 },
    block: { frames: ["block_0"], fps: 10 },
    attack_hit: { frames: ["attack_hit_0", "idle_2"], fps: 12 },
    attack_kick: { frames: ["attack_kick_0", "idle_2"], fps: 12 },
    attack_power: { frames: ["attack_power_0", "idle_2"], fps: 10 },
    knockdown: { frames: ["knockdown_0"], fps: 6 },
    ko: { frames: ["ko_0"], fps: 6 }
  };

  return { image: sheet, frames, animations };
};

const applyRenderMetaToConfig = (meta, config) => {
  if (!meta?.render) return;
  if (meta.render.origin) {
    config.anchorX = meta.render.origin.x ?? config.anchorX;
    config.anchorY = meta.render.origin.y ?? config.anchorY;
  }
  if (meta.render.baseScale) config.scale = meta.render.baseScale;
  if (meta.render.offset) {
    config.offsetX = meta.render.offset.x ?? config.offsetX;
    config.offsetY = meta.render.offset.y ?? config.offsetY;
  }
};

export class FighterAssetManager {
  constructor() {
    this.entries = new Map();
    this.retryMs = 1250;
  }

  static getTuning(id) {
    const key = String(id || "").toLowerCase();
    return readTuningMap()[key] || { scale: 1, offsetX: 0, offsetY: 0 };
  }

  static setTuning(id, tune) {
    const key = String(id || "").toLowerCase();
    if (!key) return;
    const map = readTuningMap();
    map[key] = {
      scale: Number(tune.scale ?? 1),
      offsetX: Number(tune.offsetX ?? 0),
      offsetY: Number(tune.offsetY ?? 0)
    };
    writeTuningMap(map);
  }

  static clearTuning(id) {
    const key = String(id || "").toLowerCase();
    const map = readTuningMap();
    delete map[key];
    writeTuningMap(map);
  }

  invalidate(id) {
    const key = String(id || "").toLowerCase();
    if (key) this.entries.delete(key);
  }

  async ensure(id) {
    const key = String(id || "").toLowerCase();
    if (!key) return;
    const existing = this.entries.get(key);
    if (existing?.status === "loading" || existing?.status === "ready") return;
    if (existing?.status === "failed" && Date.now() - (existing.failedAt || 0) < this.retryMs) return;

    const entry = { status: "loading", frames: null, image: null, animations: null, config: null, failedAt: 0 };
    this.entries.set(key, entry);

    try {
      const meta = RosterManager.getFighterMeta(key);
      const assetImage = meta.assets?.image || `assets/fighters/${key}/atlas.png`;
      const assetData = meta.assets?.data || `assets/fighters/${key}/atlas.json`;
      const sheetData = `assets/fighters/${key}/sheet.json`;
      const sheetImage = `assets/fighters/${key}/sheet.png`;

      const imageResult = (await loadImageWithFallback(assetImage)) || (await loadImageWithFallback(sheetImage));
      if (!imageResult) throw new Error("image load failed");

      const img = imageResult.img;
      const config = { anchorX: 0.5, anchorY: 1, scale: 1, offsetX: 0, offsetY: 0 };
      applyRenderMetaToConfig(meta, config);

      const tuning = FighterAssetManager.getTuning(key);
      const normalized = normalizeSprite(img, tuning);
      const generated = buildGeneratedSheet(normalized);

      // If valid metadata exists, keep supporting it; otherwise use generated animation set.
      let atlasFrames = generated.frames;
      let atlasAnimations = generated.animations;
      let atlasImage = generated.image;

      const dataResult = (await fetchJsonWithFallback(assetData)) || (await fetchJsonWithFallback(sheetData));
      if (dataResult?.data?.frames) {
        atlasFrames = dataResult.data.frames;
        atlasAnimations = dataResult.data.animations || generated.animations;
        atlasImage = img;
      }

      entry.status = "ready";
      entry.image = atlasImage;
      entry.frames = atlasFrames;
      entry.animations = atlasAnimations;
      entry.config = {
        ...config,
        offsetX: (config.offsetX || 0) + Number(tuning.renderOffsetX || 0),
        offsetY: (config.offsetY || 0) + Number(tuning.renderOffsetY || 0)
      };
      return;
    } catch {
      // fall through to placeholder/fallback
    }

    if (PLACEHOLDER_FIGHTERS.has(key)) {
      const placeholder = createPlaceholderSheet();
      entry.status = "ready";
      entry.image = placeholder.image;
      entry.frames = placeholder.frames;
      entry.animations = placeholder.animations;
      entry.config = placeholder.config;
      return;
    }

    entry.status = "failed";
    entry.failedAt = Date.now();
    // eslint-disable-next-line no-console
    console.warn(`[FighterAssetManager] Failed to load assets for '${key}'.`);
  }

  hasReady(id) {
    const entry = this.entries.get(String(id || "").toLowerCase());
    return entry && entry.status === "ready";
  }

  getFrame(id, animKey, timeMs) {
    const entry = this.entries.get(String(id || "").toLowerCase());
    if (!entry || entry.status !== "ready") return null;

    const animations = entry.animations;
    const frames = entry.frames;
    const key = animations && animations[animKey] ? animKey : "idle";

    if (animations && animations[key]) {
      const anim = animations[key];
      const fps = anim.fps || DEFAULT_FPS;
      const frameList = anim.frames;
      const idx = Math.floor((timeMs / 1000) * fps) % frameList.length;
      const frameKey = frameList[idx];
      const f = frames[frameKey]?.frame || frames[frameKey];
      if (!f) return null;
      return { img: entry.image, sx: f.x, sy: f.y, sw: f.w, sh: f.h, config: entry.config };
    }

    const idleFrame = frames.idle?.frame || frames.idle || frameFromCanvas(entry.image).frame;
    return { img: entry.image, sx: idleFrame.x, sy: idleFrame.y, sw: idleFrame.w, sh: idleFrame.h, config: entry.config };
  }
}
