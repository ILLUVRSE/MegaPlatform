import { FighterAssetManager } from "./FighterAssetManager.js";
import { RosterManager } from "../engine/roster/RosterManager.js";

const LANE_SCALE = { front: 1.12, mid: 1, back: 0.9 };
const LANE_BRIGHTNESS = { front: 1.1, mid: 1, back: 0.88 };
const LANE_ALPHA = { front: 1, mid: 0.98, back: 0.94 };
const BASE_FIGHTER_SCALE = 1.34;
const LANE_SHADOW = {
  front: { w: 28, h: 9, a: 0.52 },
  mid: { w: 24, h: 8, a: 0.42 },
  back: { w: 20, h: 7, a: 0.32 }
};
const PLAYER_GLOW = { p1: "#ff7a4d", p2: "#8d7bff" };
const FRAME_W = 80;
const FRAME_H = 110;

class FallbackSpriteBank {
  constructor() {
    this.cache = new Map();
  }

  get(color, accent, state) {
    const key = `${color}-${accent}-${state}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const c = document.createElement("canvas");
    c.width = FRAME_W;
    c.height = FRAME_H;
    const x = c.getContext("2d");

    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = "#101425";
    x.fillRect(22, 36, 36, 48);
    x.fillStyle = color;
    x.fillRect(24, 38, 32, 44);
    x.fillStyle = accent;
    x.fillRect(28, 18, 24, 20);

    if (state.includes("attack")) {
      x.fillStyle = color;
      x.fillRect(56, 42, 20, 8);
    } else {
      x.fillStyle = color;
      x.fillRect(56, 42, 12, 8);
    }

    x.fillRect(12, 42, 12, 8);
    x.fillRect(28, 82, 10, 20);
    x.fillRect(42, 82, 10, 20);

    if (state === "attack_kick") {
      x.fillStyle = color;
      x.fillRect(50, 78, 22, 8);
      x.fillRect(60, 70, 10, 10);
    }

    if (state === "block") {
      x.strokeStyle = "#9bf8ff";
      x.lineWidth = 3;
      x.strokeRect(18, 12, 44, 76);
    }

    if (state === "hit") {
      x.fillStyle = "rgba(255,255,255,0.65)";
      x.fillRect(20, 14, 40, 76);
    }

    x.strokeStyle = "rgba(0,0,0,0.55)";
    x.lineWidth = 2;
    x.strokeRect(24, 38, 32, 44);
    x.strokeRect(28, 18, 24, 20);

    this.cache.set(key, c);
    return c;
  }
}

export class FighterRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.bank = new FallbackSpriteBank();
    this.assets = new FighterAssetManager();
    this.hitFlash = { p1: 0, p2: 0 };
    this.hitHeavy = { p1: 0, p2: 0 };
    this.knockback = {
      p1: { x: 0, v: 0 },
      p2: { x: 0, v: 0 }
    };
    this.lastTimeMs = null;
    this.lastPos = { p1: null, p2: null };
  }

  onEvent(e) {
    if (!e?.type || !e?.data?.actor) return;
    const key = e.data.actor;
    const heavy = e.type === "LAUNCH" || e.type === "KNOCKDOWN" || e.type === "THROW" || (e.type === "HIT" && ["heavy", "launcher", "sweep", "throw"].includes(e.data?.move));
    if (e.type === "HIT" || e.type === "BLOCK" || e.type === "LAUNCH" || e.type === "KNOCKDOWN" || e.type === "THROW") {
      this.hitFlash[key] = heavy ? 0.14 : 0.09;
      this.hitHeavy[key] = heavy ? 0.12 : 0;
      const dir = typeof e.data?.dir === "number" ? e.data.dir : key === "p1" ? -1 : 1;
      const kb = this.knockback[key];
      const mag = e.type === "BLOCK" ? 2.2 : heavy ? 5.6 : 3.6;
      kb.x += dir * mag;
      kb.v += dir * mag * 18;
    }
  }

  animationFor(f, key) {
    const s = f.state;
    const last = this.lastPos[key];
    const moving = last ? Math.abs(f.x - last) > 0.4 : false;
    if (s === "idle" && moving) return "walk";
    if (["attack_hit", "attack_kick", "attack_power", "jump", "block", "hit", "launch", "knockdown", "ko", "walk", "crouch"].includes(s)) return s;
    return "idle";
  }

  updateKnockback(dt) {
    if (dt <= 0) return;
    const spring = 160;
    const damp = 18;
    ["p1", "p2"].forEach((k) => {
      const kb = this.knockback[k];
      kb.v += (-kb.x * spring - kb.v * damp) * dt;
      kb.x += kb.v * dt;
      if (Math.abs(kb.x) < 0.1) kb.x = 0;
      if (Math.abs(kb.v) < 0.1) kb.v = 0;
    });
  }

  drawOne(f, timeMs, key, dt) {
    const ctx = this.ctx;
    const meta = RosterManager.getFighterMeta(f.name);
    const laneCfg = meta.render?.lane?.[f.lane] || {};
    const scale = BASE_FIGHTER_SCALE * (LANE_SCALE[f.lane] || 1) * (laneCfg.scaleMul ?? 1) * (meta.render?.baseScale ?? 1);
    const brightness = (LANE_BRIGHTNESS[f.lane] || 1) * (laneCfg.brightMul ?? 1);
    const alpha = LANE_ALPHA[f.lane] || 1;
    const state = this.animationFor(f, key);
    const t = timeMs * 0.006 + f.x * 0.03;
    const breathe = (state === "idle" || state === "block") ? Math.sin(t) * 2.6 : Math.sin(t * 1.6) * 1.1;
    const headBob = Math.sin(t * 1.2) * 0.8;
    const sway = Math.sin(t * 0.7) * 2.4;
    const breatheScale = 1 + Math.sin(t * 1.2) * 0.012;
    const lean = state === "idle" || state === "walk" || state === "block" ? f.facing * -0.065 : 0;
    const persona = key === "p1" ? -1 : 1;
    const glow = meta.accent?.primary || PLAYER_GLOW[key] || "#8ffcff";
    const shadowCfg = LANE_SHADOW[f.lane] || LANE_SHADOW.mid;
    const shadowMul = laneCfg.shadowMul ?? 1;
    const kb = this.knockback[key]?.x || 0;

    this.assets.ensure(f.name);
    const spriteFrame = this.assets.getFrame(f.name, state, timeMs);
    const fallback = this.bank.get(f.color, f.accent, state);

    let yOffset = 0;
    if (state === "launch") yOffset = -24;
    if (state === "knockdown") yOffset = 12;

    ctx.save();
    const offsetX = meta.render?.offset?.x || 0;
    const offsetY = meta.render?.offset?.y || 0;
    ctx.translate(f.x + offsetX, f.y + 6 + offsetY);
    ctx.scale(scale, 1);
    ctx.fillStyle = `rgba(0,0,0,${shadowCfg.a * shadowMul})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowCfg.w * shadowMul, shadowCfg.h * shadowMul, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowCfg.w * 0.9, shadowCfg.h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(f.x + offsetX + kb + f.facing * 4 + sway + persona * 1.6, f.y + offsetY + yOffset + breathe + headBob + 5);
    ctx.scale(f.facing * scale * 1.08, scale * 1.08);
    ctx.rotate(lean);
    ctx.scale(breatheScale, breatheScale);
    ctx.globalAlpha = alpha;
    ctx.filter = `brightness(${brightness}) saturate(1.08) contrast(1.04)`;
    ctx.shadowColor = glow;
    ctx.shadowBlur = f.lane === "front" ? 6 : f.lane === "back" ? 3 : 5;

    if (state === "knockdown" || state === "ko") ctx.rotate(0.65);

    const drawSprite = (dx = 0, dy = 0) => {
      if (spriteFrame) {
        const cfg = spriteFrame.config || { anchorX: 0.5, anchorY: 1, scale: 1, offsetX: 0, offsetY: 0 };
        const dw = spriteFrame.sw * (cfg.scale || 1);
        const dh = spriteFrame.sh * (cfg.scale || 1);
        const ox = -dw * (cfg.anchorX ?? 0.5) + (cfg.offsetX || 0);
        const oy = -dh * (cfg.anchorY ?? 1) + (cfg.offsetY || 0);
        ctx.drawImage(spriteFrame.img, spriteFrame.sx, spriteFrame.sy, spriteFrame.sw, spriteFrame.sh, ox + dx, oy + dy, dw, dh);
      } else {
        ctx.drawImage(fallback, -44 + dx, -108 + dy, FRAME_W * 1.1, FRAME_H * 1.1);
      }
    };

    const outline = f.lane === "front" ? 2 : 1;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.filter = "brightness(0)";
    ctx.globalAlpha = 0.85;
      const offsets = outline === 2 ? [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    offsets.forEach(([ox, oy]) => drawSprite(ox, oy));
    ctx.restore();

    drawSprite(0, 0);

    // Mild accent tint helps imported sprites sit in the neon stage palette.
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = glow;
    ctx.fillRect(-58, -132, FRAME_W * 1.5, FRAME_H * 1.5);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (!spriteFrame) {
      ctx.fillStyle = f.accent;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(f.facing > 0 ? 10 : -16, -64, 6, 14);
    }

    const flash = this.hitFlash[key];
    if (flash > 0) {
      this.hitFlash[key] = Math.max(0, flash - dt);
      ctx.globalAlpha = Math.min(0.85, flash / 0.14);
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(-44, -108, FRAME_W * 1.1, FRAME_H * 1.1);
      if (this.hitHeavy[key] > 0) {
        this.hitHeavy[key] = Math.max(0, this.hitHeavy[key] - dt);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = glow;
        ctx.fillRect(-48, -112, FRAME_W * 1.2, FRAME_H * 1.2);
      }
    }

    ctx.restore();
  }

  render(snapshot) {
    const now = snapshot.timeMs;
    let dt = 0;
    if (this.lastTimeMs !== null) dt = Math.min((now - this.lastTimeMs) / 1000, 0.05);
    this.lastTimeMs = now;
    this.updateKnockback(dt);
    const ordered = [snapshot.p1, snapshot.p2].sort((a, b) => a.y - b.y);
    ordered.forEach((f) => {
      const key = f === snapshot.p1 ? "p1" : "p2";
      this.drawOne(f, snapshot.timeMs, key, dt);
      this.lastPos[key] = f.x;
    });
  }

  renderDebug(snapshot) {
    if (!snapshot.debug.enabled) return;
    const ctx = this.ctx;

    ctx.strokeStyle = "rgba(255,90,90,0.95)";
    ctx.lineWidth = 1;
    snapshot.debug.hitboxes.forEach((b) => {
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    ctx.strokeStyle = "rgba(90,220,255,0.95)";
    snapshot.debug.hurtboxes.forEach((b) => {
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    snapshot.debug.lanes.forEach((lane) => ctx.fillText(lane.name.toUpperCase(), 8, lane.y));
  }
}
