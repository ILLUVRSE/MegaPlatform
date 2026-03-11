const HEAVY_MOVES = new Set(["heavy", "launcher", "sweep", "throw"]);

export class EffectsSystem {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.puffs = [];
    this.shake = 0;
    this.slowMo = 0;
    this.zoom = 1;
    this.zoomKick = 0;
    this.kickX = 0;
    this.time = 0;
    this.hasTransform = false;
    this.shakeScale = 1;
    this.koPulse = 0;
    this.flash = 0;
    this.sparks = [];
    this.frameCenterX = width * 0.5;
    this.frameCenterY = height * 0.55;
    this.frameZoom = 1;
  }

  setCombatFrame(snapshot) {
    if (!snapshot?.p1 || !snapshot?.p2) return;
    const centerX = (snapshot.p1.x + snapshot.p2.x) * 0.5;
    const centerY = (snapshot.p1.y + snapshot.p2.y) * 0.5;
    const dist = Math.abs(snapshot.p1.x - snapshot.p2.x);
    const desiredZoom = dist < 150 ? 1.04 : dist > 280 ? 0.96 : 1.0;
    this.frameCenterX += (centerX - this.frameCenterX) * 0.2;
    this.frameCenterY += (centerY - this.frameCenterY) * 0.2;
    this.frameZoom += (desiredZoom - this.frameZoom) * 0.15;
  }

  onEvent(event) {
    const e = event.type;
    const x = typeof event.data?.x === "number" ? event.data.x : event.data?.actor === "p1" ? 300 : 660;
    const y = typeof event.data?.y === "number" ? event.data.y : 270 + Math.random() * 90;
    const atk = event.data?.attackType;
    if (e === "HIT" || e === "BLOCK" || e === "LAUNCH" || e === "KNOCKDOWN") {
      const tint = atk === "kick" ? "#a98bff" : e === "BLOCK" ? "#8ffcff" : e === "LAUNCH" ? "#ffe47a" : "#ff9a70";
      this.puffs.push({
        x,
        y: y - 24,
        t: 0.16,
        c: tint
      });
      const rays = e === "BLOCK" ? 6 : isFinite(event.data?.damage) && event.data.damage >= 12 ? 13 : 9;
      for (let i = 0; i < rays; i += 1) {
        const a = (Math.PI * 2 * i) / rays + Math.random() * 0.45;
        const speed = (e === "BLOCK" ? 66 : 92) + Math.random() * 52;
        this.sparks.push({
          x,
          y: y - 24,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          t: 0.12 + Math.random() * 0.08,
          life: 0.12 + Math.random() * 0.08,
          c: tint
        });
      }
    }
    const isHeavy = e === "LAUNCH" || e === "KNOCKDOWN" || e === "THROW" || (e === "HIT" && HEAVY_MOVES.has(event.data?.move));
    if (e === "HIT") this.shake = Math.max(this.shake, isHeavy ? 4.6 : 2.9);
    if (e === "BLOCK") this.shake = Math.max(this.shake, 1.8);
    if (e === "KNOCKDOWN" || e === "LAUNCH") this.shake = Math.max(this.shake, 7);
    if (e === "KO") {
      this.shake = Math.max(this.shake, 10);
      this.slowMo = 0.12;
      this.zoom = Math.max(this.zoom, 1.05);
      this.koPulse = 0.6;
      this.flash = 0.08;
    }
    const dir = typeof event.data?.dir === "number" ? event.data.dir : event.data?.actor === "p1" ? -1 : 1;
    if (isHeavy) {
      this.zoom = Math.max(this.zoom, 1.08);
      this.zoomKick = Math.max(this.zoomKick, 0.06);
      this.kickX = dir * 3.5;
    } else if (e === "HIT") {
      this.zoom = Math.max(this.zoom, 1.03);
      this.zoomKick = Math.max(this.zoomKick, 0.02);
      this.kickX = dir * 1.6;
    }
  }

  tick(dt) {
    this.time += dt;
    this.puffs.forEach((p) => (p.t -= dt));
    this.puffs = this.puffs.filter((p) => p.t > 0);
    this.sparks.forEach((s) => {
      s.t -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy = s.vy * 0.92 + 24 * dt;
    });
    this.sparks = this.sparks.filter((s) => s.t > 0);
    if (this.shake > 0) this.shake *= 0.8;
    if (this.slowMo > 0) this.slowMo -= dt;
    if (this.zoom > 1) {
      this.zoom -= (this.zoom - 1) * 0.18;
    }
    if (this.zoomKick > 0) this.zoomKick *= 0.7;
    if (Math.abs(this.kickX) > 0.05) this.kickX *= 0.72;
    if (this.koPulse > 0) this.koPulse -= dt;
    if (this.flash > 0) this.flash -= dt;
  }

  beginCamera() {
    const driftX = Math.sin(this.time * 0.6) * 0.6;
    const driftY = Math.sin(this.time * 0.8) * 0.4;
    const shakeAmount = this.shake * this.shakeScale;
    const kickX = this.kickX * this.shakeScale;
    const hasShake = shakeAmount > 0.15;
    const mixedZoom = this.zoom * this.frameZoom;
    const hasZoom = Math.abs(mixedZoom - 1) > 0.001;
    const hasDrift = Math.abs(driftX) > 0.01 || Math.abs(driftY) > 0.01;
    const hasKick = Math.abs(kickX) > 0.05;
    if (!hasShake && !hasZoom && !hasDrift && !hasKick) return;
    this.hasTransform = true;
    const ctx = this.ctx;
    ctx.save();
    if (hasZoom) {
      ctx.translate(this.width * 0.5, this.height * 0.55);
      ctx.scale(mixedZoom, mixedZoom);
      ctx.translate(-this.frameCenterX, -this.frameCenterY);
    }
    if (hasKick || hasDrift) ctx.translate(kickX + driftX, driftY);
    if (hasShake) ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
  }

  endCamera() {
    if (!this.hasTransform) return;
    this.ctx.restore();
    this.hasTransform = false;
  }

  render() {
    const ctx = this.ctx;
    this.puffs.forEach((p) => {
      const a = p.t / 0.16;
      const w = 1 + (1 - a) * 0.6;
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.c;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (8 + i * 4) * w, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    this.sparks.forEach((s) => {
      const a = Math.max(0, s.t / s.life);
      ctx.globalAlpha = a;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (this.flash > 0) {
      const a = Math.min(0.22, this.flash / 0.06);
      ctx.fillStyle = `rgba(255, 244, 220, ${a})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.koPulse > 0) {
      const t = this.koPulse / 0.6;
      const pulse = ctx.createRadialGradient(this.width * 0.5, this.height * 0.5, this.width * 0.2, this.width * 0.5, this.height * 0.5, this.width * 0.75);
      pulse.addColorStop(0, "rgba(0,0,0,0)");
      pulse.addColorStop(1, `rgba(5, 6, 18, ${0.45 * t})`);
      ctx.fillStyle = pulse;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  setShakeLevel(level) {
    if (level === "off") this.shakeScale = 0;
    else if (level === "reduced") this.shakeScale = 0.5;
    else this.shakeScale = 1;
  }
}
