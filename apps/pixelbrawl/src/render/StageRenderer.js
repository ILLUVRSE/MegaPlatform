import { StageManager } from "../stages/StageManager.js";

const STAGE_ASSET_PACKS = {
  neonDojo: {
    dir: "neon-dojo",
    layers: [
      { file: "layer0_far.png", speed: 2, alpha: 1 },
      { file: "layer1_city.png", speed: 6, alpha: 1 },
      { file: "layer2_signage.png", speed: 12, alpha: 1 },
      { file: "layer3_pillars.png", speed: 18, alpha: 1 },
      { file: "layer4_foreground.png", speed: 26, alpha: 1 }
    ],
    floor: "floor_base.png",
    emblem: "hero_emblem.png"
  }
};

const imageCandidates = (dir, file) => {
  const list = [`assets/stages/${dir}/${file}`];
  // Legacy compatibility for original numbered layers.
  if (file === "layer0_far.png") list.push(`assets/stages/${dir}/layer0.png`);
  if (file === "layer1_city.png") list.push(`assets/stages/${dir}/layer1.png`);
  if (file === "layer2_signage.png") list.push(`assets/stages/${dir}/layer2.png`);
  if (file === "layer3_pillars.png") list.push(`assets/stages/${dir}/layer3.png`);
  return list;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const loadFirstImage = async (candidates) => {
  for (const src of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const img = await loadImage(src);
      return img;
    } catch {
      // try next
    }
  }
  return null;
};

export class StageRenderer {
  constructor(ctx, width, height, stageId) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.lastTime = 0;
    this.assetPack = null;
    this.assetLoadToken = 0;
    this.setStage(stageId);
  }

  async loadAssetPack(stageId) {
    const spec = STAGE_ASSET_PACKS[stageId];
    if (!spec) return null;

    const layers = [];
    for (const layer of spec.layers) {
      // eslint-disable-next-line no-await-in-loop
      const img = await loadFirstImage(imageCandidates(spec.dir, layer.file));
      if (!img) return null;
      layers.push({ ...layer, image: img });
    }

    const floor = spec.floor ? await loadFirstImage(imageCandidates(spec.dir, spec.floor)) : null;
    const emblem = spec.emblem ? await loadFirstImage(imageCandidates(spec.dir, spec.emblem)) : null;

    return {
      dir: spec.dir,
      layers,
      floor,
      emblem
    };
  }

  setStage(stageId) {
    this.stageId = stageId;
    this.stage = StageManager.getStageById(stageId);
    this.state = this.stage.create({
      ctx: this.ctx,
      width: this.width,
      height: this.height
    });

    this.assetPack = null;
    this.assetLoadToken += 1;
    const token = this.assetLoadToken;
    this.loadAssetPack(stageId).then((pack) => {
      if (token !== this.assetLoadToken) return;
      this.assetPack = pack;
    });
  }

  renderAssetPack(snapshot, timeMs, deltaMs) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const t = timeMs * 0.001;

    const drawLayer = (layer) => {
      const speed = layer.speed || 0;
      const ox = (t * speed) % width;
      ctx.globalAlpha = layer.alpha ?? 1;
      ctx.drawImage(layer.image, -ox, 0, width, height);
      ctx.drawImage(layer.image, width - ox, 0, width, height);
      ctx.globalAlpha = 1;
    };

    this.assetPack.layers.forEach((layer) => drawLayer(layer));

    if (this.assetPack.emblem) {
      const pulse = 0.985 + Math.sin(t * 0.6) * 0.015;
      const flicker = Math.random() > 0.995 ? 0.62 : 1;
      ctx.save();
      ctx.globalAlpha = 0.42 * flicker;
      ctx.translate(width * 0.5, height * 0.33);
      ctx.scale(pulse, pulse);
      const ew = 220;
      const eh = 220;
      ctx.drawImage(this.assetPack.emblem, -ew * 0.5, -eh * 0.5, ew, eh);
      ctx.restore();
    }

    const floorTop = height * 0.54;
    if (this.assetPack.floor) {
      ctx.drawImage(this.assetPack.floor, 0, floorTop, width, height - floorTop);
    }

    // Preserve lane readability and fighter grounding when using art-driven stages.
    snapshot.debug.lanes.forEach((lane, idx) => {
      ctx.strokeStyle = idx === 1 ? "rgba(110, 230, 255, 0.3)" : "rgba(110, 230, 255, 0.15)";
      ctx.lineWidth = idx === 1 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(34, lane.y + idx * 4);
      ctx.lineTo(width - 34, lane.y + idx * 4);
      ctx.stroke();
    });

    [snapshot.p1, snapshot.p2].forEach((f) => {
      const laneBoost = f.lane === "front" ? 1.2 : f.lane === "back" ? 0.7 : 1;
      const glow = ctx.createRadialGradient(f.x, f.y + 6, 4, f.x, f.y + 6, 34 * laneBoost);
      glow.addColorStop(0, "rgba(120, 255, 235, 0.16)");
      glow.addColorStop(1, "rgba(120, 255, 235, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, 34 * laneBoost, 0, Math.PI * 2);
      ctx.fill();
    });

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.46, width * 0.26, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,6,20,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    void deltaMs;
  }

  render(snapshot, timeMs) {
    if (!this.stage) return;
    if (!this.lastTime) this.lastTime = timeMs;
    const deltaMs = Math.min(timeMs - this.lastTime, 50);
    this.lastTime = timeMs;

    if (this.assetPack) {
      this.renderAssetPack(snapshot, timeMs, deltaMs);
      return;
    }

    this.stage.update(
      {
        ctx: this.ctx,
        width: this.width,
        height: this.height,
        snapshot,
        state: this.state
      },
      timeMs,
      deltaMs
    );
  }
}
