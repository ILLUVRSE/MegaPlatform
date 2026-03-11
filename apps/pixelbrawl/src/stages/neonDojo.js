const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export const neonDojo = {
  id: "neonDojo",
  displayName: "Neon Cyber Dojo",
  load() {},
  create(scene) {
    const { width, height } = scene;
    const layers = {
      far: makeCanvas(width, height),
      city: makeCanvas(width, height),
      signage: makeCanvas(width, height),
      pillars: makeCanvas(width, height),
      fg: makeCanvas(width, height),
      hero: makeCanvas(240, 240),
      floor: makeCanvas(width, height)
    };

    const far = layers.far.getContext("2d");
    const farG = far.createLinearGradient(0, 0, 0, height);
    farG.addColorStop(0, "#030815");
    farG.addColorStop(0.5, "#131a46");
    farG.addColorStop(1, "#0b0f2a");
    far.fillStyle = farG;
    far.fillRect(0, 0, width, height);
    for (let i = 0; i < 50; i += 1) {
      far.fillStyle = `rgba(110, 230, 255, ${0.12 + Math.random() * 0.2})`;
      far.fillRect(Math.random() * width, Math.random() * height * 0.35, 1, 1);
    }

    const city = layers.city.getContext("2d");
    city.fillStyle = "#0c1332";
    city.fillRect(0, height * 0.18, width, height * 0.3);
    for (let i = 0; i < 18; i += 1) {
      const w = 40 + Math.random() * 80;
      const h = 60 + Math.random() * 120;
      const px = (i * 120 + Math.random() * 60) % width;
      const py = height * 0.48 - h;
      city.fillStyle = "#0a0f29";
      city.fillRect(px, py, w, h);
      city.fillStyle = "rgba(120, 255, 235, 0.08)";
      city.fillRect(px + 6, py + 12, w * 0.3, 6);
    }

    const signage = layers.signage.getContext("2d");
    for (let i = 0; i < 12; i += 1) {
      const w = 28 + Math.random() * 60;
      const h = 10 + Math.random() * 20;
      const px = (i * 90 + Math.random() * 40) % width;
      const py = height * (0.14 + Math.random() * 0.18);
      signage.fillStyle = i % 2 ? "rgba(90,240,255,0.25)" : "rgba(255,120,185,0.22)";
      signage.fillRect(px, py, w, h);
    }

    const pillars = layers.pillars.getContext("2d");
    pillars.fillStyle = "rgba(15, 20, 50, 0.9)";
    for (let i = 0; i < 6; i += 1) {
      const px = i * (width / 5);
      pillars.fillRect(px - 14, height * 0.18, 28, height * 0.45);
      pillars.fillStyle = "rgba(90,240,255,0.08)";
      pillars.fillRect(px - 10, height * 0.2, 20, 6);
      pillars.fillStyle = "rgba(15, 20, 50, 0.9)";
    }

    const fg = layers.fg.getContext("2d");
    fg.strokeStyle = "rgba(90, 240, 255, 0.15)";
    for (let i = 0; i < 4; i += 1) {
      fg.beginPath();
      fg.moveTo(0, height * (0.1 + i * 0.07));
      fg.lineTo(width, height * (0.12 + i * 0.07));
      fg.stroke();
    }

    const hero = layers.hero.getContext("2d");
    hero.translate(120, 120);
    hero.strokeStyle = "rgba(120, 255, 235, 0.4)";
    hero.lineWidth = 6;
    hero.beginPath();
    hero.arc(0, 0, 80, 0, Math.PI * 2);
    hero.stroke();
    hero.strokeStyle = "rgba(255, 120, 185, 0.35)";
    hero.lineWidth = 4;
    hero.beginPath();
    hero.moveTo(-40, -10);
    hero.lineTo(40, -10);
    hero.moveTo(-20, 20);
    hero.lineTo(20, 20);
    hero.stroke();

    const floor = layers.floor.getContext("2d");
    const floorTop = height * 0.54;
    const g = floor.createLinearGradient(0, floorTop, 0, height);
    g.addColorStop(0, "#142b58");
    g.addColorStop(0.7, "#0c1938");
    g.addColorStop(1, "#080f24");
    floor.fillStyle = g;
    floor.fillRect(0, floorTop, width, height * 0.46);

    return {
      layers,
      particles: Array.from({ length: 12 }, () => ({
        x: Math.random() * width,
        y: height * (0.12 + Math.random() * 0.42),
        s: 0.15 + Math.random() * 0.5,
        drift: 0.2 + Math.random() * 0.4,
        a: 0.2 + Math.random() * 0.3
      })),
      signFlickers: Array.from({ length: 6 }, () => ({
        x: Math.random() * width,
        y: height * (0.12 + Math.random() * 0.22),
        w: 20 + Math.random() * 40,
        h: 6 + Math.random() * 12,
        p: Math.random() * 10
      }))
    };
  },
  update(scene, timeMs, deltaMs) {
    const { ctx, width, height, state, snapshot } = scene;
    const t = timeMs * 0.001;
    const dt = deltaMs * 0.001;
    const flicker = 0.9 + Math.sin(t * 3.1) * 0.06 + Math.sin(t * 9.6) * 0.03;
    const drift = Math.sin(t * 0.4) * 3;

    const drawLayer = (canvas, speed, yOffset = 0, alpha = 1) => {
      const ox = (t * speed) % width;
      ctx.globalAlpha = alpha;
      ctx.drawImage(canvas, -ox, yOffset);
      ctx.drawImage(canvas, width - ox, yOffset);
      ctx.globalAlpha = 1;
    };

    drawLayer(state.layers.far, 2);
    drawLayer(state.layers.city, 6);
    drawLayer(state.layers.signage, 12, drift);
    drawLayer(state.layers.pillars, 18);
    drawLayer(state.layers.fg, 26);

    const heroPulse = 0.98 + Math.sin(t * 0.6) * 0.02;
    const heroFlicker = Math.random() > 0.995 ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = 0.35 * flicker * heroFlicker;
    ctx.translate(width * 0.5, height * 0.33);
    ctx.scale(heroPulse, heroPulse);
    ctx.drawImage(state.layers.hero, -120, -120);
    ctx.restore();

    const sweepT = (t % 10) / 10;
    if (sweepT < 0.2) {
      const sweepX = sweepT * width * 5 - width;
      const sweep = ctx.createLinearGradient(sweepX, 0, sweepX + 200, 0);
      sweep.addColorStop(0, "rgba(120, 255, 235, 0)");
      sweep.addColorStop(0.5, "rgba(120, 255, 235, 0.08)");
      sweep.addColorStop(1, "rgba(120, 255, 235, 0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, width, height * 0.6);
    }

    state.signFlickers.forEach((s) => {
      const on = Math.sin(t * 0.8 + s.p) > 0.97 ? 0.2 : 1;
      ctx.fillStyle = `rgba(255, 200, 120, ${0.18 * on})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    const floorTop = height * 0.54;
    ctx.drawImage(state.layers.floor, 0, 0);

    ctx.strokeStyle = "rgba(90, 230, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      const x = 30 + i * ((width - 60) / 11);
      ctx.beginPath();
      ctx.moveTo(x, floorTop + 10);
      ctx.lineTo(width * 0.5 + (x - width * 0.5) * 1.2, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120, 255, 235, 0.12)";
    ctx.beginPath();
    ctx.moveTo(40, floorTop + 18);
    ctx.lineTo(width - 40, floorTop + 18);
    ctx.stroke();

    const scan = ctx.createLinearGradient(0, floorTop, width, floorTop);
    const scanPos = (t * 18) % width;
    scan.addColorStop(0, "rgba(255,255,255,0)");
    scan.addColorStop(Math.max(0, scanPos / width - 0.05), "rgba(160, 240, 255, 0)");
    scan.addColorStop(scanPos / width, "rgba(160, 240, 255, 0.08)");
    scan.addColorStop(Math.min(1, scanPos / width + 0.05), "rgba(160, 240, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(0, floorTop, width, height - floorTop);

    [snapshot.p1, snapshot.p2].forEach((f) => {
      const laneBoost = f.lane === "front" ? 1.2 : f.lane === "back" ? 0.7 : 1;
      const g = ctx.createRadialGradient(f.x, f.y + 6, 4, f.x, f.y + 6, 36 * laneBoost);
      g.addColorStop(0, "rgba(120, 255, 235, 0.18)");
      g.addColorStop(1, "rgba(120, 255, 235, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, 36 * laneBoost, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, floorTop, width, height - floorTop);
    ctx.clip();
    const focusFade = (f) => {
      const r = 130;
      const g2 = ctx.createRadialGradient(f.x, f.y + 10, 20, f.x, f.y + 10, r);
      g2.addColorStop(0, "rgba(9, 15, 28, 0)");
      g2.addColorStop(0.55, "rgba(9, 15, 28, 0.28)");
      g2.addColorStop(1, "rgba(9, 15, 28, 0.46)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 10, r, 0, Math.PI * 2);
      ctx.fill();
    };
    focusFade(snapshot.p1);
    focusFade(snapshot.p2);
    ctx.restore();

    snapshot.debug.lanes.forEach((lane, idx) => {
      ctx.strokeStyle = idx === 1 ? "rgba(103, 255, 252, 0.45)" : "rgba(103, 255, 252, 0.2)";
      ctx.lineWidth = idx === 1 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(34, lane.y + idx * 4);
      ctx.lineTo(width - 34, lane.y + idx * 4);
      ctx.stroke();
    });

    state.particles.forEach((p) => {
      p.y -= p.drift * dt * 60;
      if (p.y < height * 0.08) p.y = height * 0.5 + Math.random() * 40;
      ctx.fillStyle = `rgba(140, 255, 230, ${p.a})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    const cool = ctx.createLinearGradient(0, 0, 0, height);
    cool.addColorStop(0, "rgba(80, 120, 255, 0.08)");
    cool.addColorStop(1, "rgba(255, 120, 120, 0.05)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,6,20,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
};
