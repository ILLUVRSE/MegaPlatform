const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export const streetAlley = {
  id: "streetAlley",
  displayName: "Street Alley Punk",
  load() {},
  create(scene) {
    const { width, height } = scene;
    const layers = {
      far: makeCanvas(width, height),
      city: makeCanvas(width, height),
      signage: makeCanvas(width, height),
      pillars: makeCanvas(width, height),
      fg: makeCanvas(width, height),
      hero: makeCanvas(260, 180),
      floor: makeCanvas(width, height)
    };

    const far = layers.far.getContext("2d");
    const farG = far.createLinearGradient(0, 0, 0, height);
    farG.addColorStop(0, "#06070d");
    farG.addColorStop(0.6, "#0f1322");
    farG.addColorStop(1, "#0b0d18");
    far.fillStyle = farG;
    far.fillRect(0, 0, width, height);
    for (let i = 0; i < 40; i += 1) {
      far.fillStyle = `rgba(120, 140, 200, ${0.1 + Math.random() * 0.15})`;
      far.fillRect(Math.random() * width, Math.random() * height * 0.3, 1, 1);
    }

    const city = layers.city.getContext("2d");
    city.fillStyle = "#0b0f1f";
    city.fillRect(0, height * 0.2, width, height * 0.28);
    for (let i = 0; i < 20; i += 1) {
      const w = 50 + Math.random() * 90;
      const h = 70 + Math.random() * 140;
      const x = (i * 110 + Math.random() * 60) % width;
      const y = height * 0.48 - h;
      city.fillStyle = "#090c18";
      city.fillRect(x, y, w, h);
      city.fillStyle = "rgba(130, 220, 255, 0.05)";
      city.fillRect(x + 6, y + 10, w * 0.4, 6);
    }

    const signage = layers.signage.getContext("2d");
    for (let i = 0; i < 10; i += 1) {
      const w = 40 + Math.random() * 70;
      const h = 12 + Math.random() * 18;
      const x = (i * 100 + Math.random() * 50) % width;
      const y = height * (0.16 + Math.random() * 0.18);
      signage.fillStyle = i % 2 ? "rgba(255,120,90,0.25)" : "rgba(120,220,255,0.2)";
      signage.fillRect(x, y, w, h);
    }

    const pillars = layers.pillars.getContext("2d");
    pillars.strokeStyle = "rgba(80, 100, 140, 0.35)";
    pillars.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const x = i * (width / 4.5) + 30;
      pillars.beginPath();
      pillars.moveTo(x, height * 0.18);
      pillars.lineTo(x, height * 0.6);
      pillars.stroke();
    }

    const fg = layers.fg.getContext("2d");
    fg.strokeStyle = "rgba(70, 110, 160, 0.2)";
    for (let i = 0; i < 6; i += 1) {
      const y = height * (0.14 + i * 0.05);
      fg.beginPath();
      fg.moveTo(0, y);
      fg.lineTo(width, y + 6);
      fg.stroke();
    }

    const hero = layers.hero.getContext("2d");
    hero.translate(130, 90);
    hero.strokeStyle = "rgba(255, 120, 90, 0.45)";
    hero.lineWidth = 6;
    hero.beginPath();
    hero.rect(-80, -40, 160, 80);
    hero.stroke();
    hero.strokeStyle = "rgba(120, 220, 255, 0.4)";
    hero.lineWidth = 4;
    hero.beginPath();
    hero.moveTo(-50, 0);
    hero.lineTo(50, 0);
    hero.moveTo(-30, -18);
    hero.lineTo(30, -18);
    hero.stroke();

    const floor = layers.floor.getContext("2d");
    const floorTop = height * 0.54;
    const g = floor.createLinearGradient(0, floorTop, 0, height);
    g.addColorStop(0, "#1a1f2d");
    g.addColorStop(0.7, "#121622");
    g.addColorStop(1, "#0b0e18");
    floor.fillStyle = g;
    floor.fillRect(0, floorTop, width, height * 0.46);

    const barrels = [
      { x: width * 0.22, y: height * 0.62 },
      { x: width * 0.78, y: height * 0.6 }
    ];

    return {
      layers,
      barrels,
      steam: Array.from({ length: 16 }, () => ({
        x: width * 0.2 + Math.random() * width * 0.6,
        y: height * (0.35 + Math.random() * 0.25),
        vx: -0.1 + Math.random() * 0.2,
        vy: 0.2 + Math.random() * 0.35,
        a: 0.12 + Math.random() * 0.18,
        s: 6 + Math.random() * 10
      })),
      signFlickers: Array.from({ length: 5 }, () => ({
        x: Math.random() * width,
        y: height * (0.15 + Math.random() * 0.2),
        w: 18 + Math.random() * 40,
        h: 6 + Math.random() * 10,
        p: Math.random() * 12
      }))
    };
  },
  update(scene, timeMs, deltaMs) {
    const { ctx, width, height, state, snapshot } = scene;
    const t = timeMs * 0.001;
    const dt = deltaMs * 0.001;

    const drawLayer = (canvas, speed, yOffset = 0, alpha = 1) => {
      const ox = (t * speed) % width;
      ctx.globalAlpha = alpha;
      ctx.drawImage(canvas, -ox, yOffset);
      ctx.drawImage(canvas, width - ox, yOffset);
      ctx.globalAlpha = 1;
    };

    drawLayer(state.layers.far, 1.5);
    drawLayer(state.layers.city, 4);
    drawLayer(state.layers.signage, 7, Math.sin(t * 0.4) * 2);
    drawLayer(state.layers.pillars, 10);
    drawLayer(state.layers.fg, 14);

    const heroPulse = 0.98 + Math.sin(t * 0.7) * 0.02;
    const heroFlicker = Math.random() > 0.996 ? 0.55 : 1;
    ctx.save();
    ctx.globalAlpha = 0.4 * heroFlicker;
    ctx.translate(width * 0.5, height * 0.33);
    ctx.scale(heroPulse, heroPulse);
    ctx.drawImage(state.layers.hero, -130, -90);
    ctx.restore();

    const sweepT = (t % 12) / 12;
    if (sweepT < 0.18) {
      const sweepX = sweepT * width * 6 - width;
      const sweep = ctx.createLinearGradient(sweepX, 0, sweepX + 220, 0);
      sweep.addColorStop(0, "rgba(255,220,120,0)");
      sweep.addColorStop(0.5, "rgba(255,220,120,0.08)");
      sweep.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, width, height * 0.55);
    }

    state.signFlickers.forEach((s) => {
      const on = Math.sin(t * 0.7 + s.p) > 0.96 ? 0.3 : 1;
      ctx.fillStyle = `rgba(255, 180, 120, ${0.16 * on})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    const floorTop = height * 0.54;
    ctx.drawImage(state.layers.floor, 0, 0);

    ctx.strokeStyle = "rgba(120, 180, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const x = 36 + i * ((width - 72) / 10);
      ctx.beginPath();
      ctx.moveTo(x, floorTop + 12);
      ctx.lineTo(width * 0.5 + (x - width * 0.5) * 1.2, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 180, 120, 0.1)";
    ctx.beginPath();
    ctx.moveTo(40, floorTop + 18);
    ctx.lineTo(width - 40, floorTop + 18);
    ctx.stroke();

    const scan = ctx.createLinearGradient(0, floorTop, width, floorTop);
    const scanPos = (t * 14) % width;
    scan.addColorStop(0, "rgba(255,255,255,0)");
    scan.addColorStop(Math.max(0, scanPos / width - 0.05), "rgba(255, 220, 160, 0)");
    scan.addColorStop(scanPos / width, "rgba(255, 220, 160, 0.07)");
    scan.addColorStop(Math.min(1, scanPos / width + 0.05), "rgba(255, 220, 160, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(0, floorTop, width, height - floorTop);

    state.barrels.forEach((b, i) => {
      const flick = 0.85 + Math.sin(t * 6 + i) * 0.1;
      const g = ctx.createRadialGradient(b.x, b.y, 6, b.x, b.y, 40);
      g.addColorStop(0, `rgba(255, 140, 60, ${0.35 * flick})`);
      g.addColorStop(1, "rgba(255, 140, 60, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 40, 0, Math.PI * 2);
      ctx.fill();
    });

    [snapshot.p1, snapshot.p2].forEach((f) => {
      const laneBoost = f.lane === "front" ? 1.2 : f.lane === "back" ? 0.7 : 1;
      const g = ctx.createRadialGradient(f.x, f.y + 6, 4, f.x, f.y + 6, 34 * laneBoost);
      g.addColorStop(0, "rgba(255, 180, 120, 0.16)");
      g.addColorStop(1, "rgba(255, 180, 120, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, 34 * laneBoost, 0, Math.PI * 2);
      ctx.fill();
    });

    state.steam.forEach((p) => {
      p.y -= p.vy * dt * 60;
      p.x += p.vx * dt * 60;
      if (p.y < height * 0.16) {
        p.y = height * (0.4 + Math.random() * 0.2);
        p.x = width * 0.2 + Math.random() * width * 0.6;
      }
      ctx.fillStyle = `rgba(180, 200, 240, ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });

    snapshot.debug.lanes.forEach((lane, idx) => {
      ctx.strokeStyle = idx === 1 ? "rgba(255, 190, 140, 0.35)" : "rgba(180, 180, 220, 0.18)";
      ctx.lineWidth = idx === 1 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(34, lane.y + idx * 4);
      ctx.lineTo(width - 34, lane.y + idx * 4);
      ctx.stroke();
    });

    const cool = ctx.createLinearGradient(0, 0, 0, height);
    cool.addColorStop(0, "rgba(60, 100, 160, 0.08)");
    cool.addColorStop(1, "rgba(255, 180, 120, 0.05)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,6,20,0.4)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
};
