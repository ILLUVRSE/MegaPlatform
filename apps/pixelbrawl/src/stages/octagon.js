const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export const octagon = {
  id: "octagon",
  displayName: "MMA Octagon",
  load() {},
  create(scene) {
    const { width, height } = scene;
    const layers = {
      far: makeCanvas(width, height),
      city: makeCanvas(width, height),
      signage: makeCanvas(width, height),
      pillars: makeCanvas(width, height),
      fg: makeCanvas(width, height),
      hero: makeCanvas(260, 140),
      floor: makeCanvas(width, height)
    };

    const far = layers.far.getContext("2d");
    const farG = far.createLinearGradient(0, 0, 0, height);
    farG.addColorStop(0, "#0a0a0f");
    farG.addColorStop(0.6, "#12141c");
    farG.addColorStop(1, "#0c0f16");
    far.fillStyle = farG;
    far.fillRect(0, 0, width, height);

    const city = layers.city.getContext("2d");
    city.fillStyle = "#0c1018";
    city.fillRect(0, height * 0.2, width, height * 0.32);
    for (let i = 0; i < 22; i += 1) {
      const w = 30 + Math.random() * 60;
      const h = 30 + Math.random() * 60;
      const x = Math.random() * width;
      const y = height * 0.2 + Math.random() * 0.2 * height;
      city.fillStyle = "rgba(40, 50, 70, 0.6)";
      city.fillRect(x, y, w, h);
    }

    const signage = layers.signage.getContext("2d");
    signage.fillStyle = "rgba(80, 200, 255, 0.25)";
    signage.fillRect(width * 0.25, height * 0.16, width * 0.5, height * 0.06);
    for (let i = 0; i < 8; i += 1) {
      const w = 30 + Math.random() * 60;
      const x = width * (0.1 + Math.random() * 0.8);
      const y = height * (0.15 + Math.random() * 0.18);
      signage.fillStyle = "rgba(255, 255, 255, 0.08)";
      signage.fillRect(x, y, w, 6);
    }

    const pillars = layers.pillars.getContext("2d");
    pillars.fillStyle = "rgba(20, 24, 36, 0.9)";
    for (let i = 0; i < 8; i += 1) {
      const x = i * (width / 7);
      pillars.fillRect(x - 8, height * 0.18, 16, height * 0.45);
    }

    const fg = layers.fg.getContext("2d");
    fg.strokeStyle = "rgba(120, 200, 255, 0.12)";
    for (let i = 0; i < 5; i += 1) {
      const y = height * (0.12 + i * 0.06);
      fg.beginPath();
      fg.moveTo(0, y);
      fg.lineTo(width, y + 4);
      fg.stroke();
    }

    const hero = layers.hero.getContext("2d");
    hero.fillStyle = "rgba(100, 200, 255, 0.2)";
    hero.fillRect(0, 20, 260, 90);
    hero.strokeStyle = "rgba(255, 255, 255, 0.45)";
    hero.lineWidth = 4;
    hero.strokeRect(10, 30, 240, 70);
    hero.fillStyle = "rgba(255, 255, 255, 0.3)";
    hero.fillRect(30, 55, 200, 18);

    const floor = layers.floor.getContext("2d");
    const floorTop = height * 0.54;
    const g = floor.createLinearGradient(0, floorTop, 0, height);
    g.addColorStop(0, "#1b1f28");
    g.addColorStop(0.7, "#12161f");
    g.addColorStop(1, "#0c0f16");
    floor.fillStyle = g;
    floor.fillRect(0, floorTop, width, height * 0.46);

    return {
      layers,
      crowd: Array.from({ length: 20 }, () => ({
        x: Math.random() * width,
        y: height * (0.25 + Math.random() * 0.2),
        w: 10 + Math.random() * 22,
        h: 18 + Math.random() * 30,
        a: 0.3 + Math.random() * 0.3
      })),
      flashes: Array.from({ length: 4 }, () => ({
        x: Math.random() * width,
        y: height * (0.2 + Math.random() * 0.2),
        t: Math.random() * 10
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
    drawLayer(state.layers.signage, 8, Math.sin(t * 0.2) * 2);
    drawLayer(state.layers.pillars, 12);
    drawLayer(state.layers.fg, 16);

    const heroPulse = 0.985 + Math.sin(t * 0.7) * 0.015;
    const ledFlicker = Math.random() > 0.992 ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = 0.45 * ledFlicker;
    ctx.translate(width * 0.5, height * 0.32);
    ctx.scale(heroPulse, heroPulse);
    ctx.drawImage(state.layers.hero, -130, -70);
    ctx.restore();

    state.crowd.forEach((c) => {
      ctx.fillStyle = `rgba(30, 40, 60, ${c.a})`;
      ctx.fillRect(c.x, c.y, c.w, c.h);
    });

    state.flashes.forEach((f) => {
      f.t -= dt;
      if (f.t < 0) {
        f.t = 6 + Math.random() * 6;
        f.x = Math.random() * width;
        f.y = height * (0.22 + Math.random() * 0.2);
      }
      if (f.t < 0.08) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(f.x, f.y, 8, 6);
      }
    });

    const floorTop = height * 0.54;
    ctx.drawImage(state.layers.floor, 0, 0);

    ctx.strokeStyle = "rgba(120, 200, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const x = 36 + i * ((width - 72) / 10);
      ctx.beginPath();
      ctx.moveTo(x, floorTop + 12);
      ctx.lineTo(width * 0.5 + (x - width * 0.5) * 1.2, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120, 200, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(40, floorTop + 18);
    ctx.lineTo(width - 40, floorTop + 18);
    ctx.stroke();

    const scan = ctx.createLinearGradient(0, floorTop, width, floorTop);
    const scanPos = (t * 16) % width;
    scan.addColorStop(0, "rgba(255,255,255,0)");
    scan.addColorStop(Math.max(0, scanPos / width - 0.05), "rgba(180, 220, 255, 0)");
    scan.addColorStop(scanPos / width, "rgba(180, 220, 255, 0.08)");
    scan.addColorStop(Math.min(1, scanPos / width + 0.05), "rgba(180, 220, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(0, floorTop, width, height - floorTop);

    [snapshot.p1, snapshot.p2].forEach((f) => {
      const laneBoost = f.lane === "front" ? 1.2 : f.lane === "back" ? 0.7 : 1;
      const g = ctx.createRadialGradient(f.x, f.y + 6, 4, f.x, f.y + 6, 34 * laneBoost);
      g.addColorStop(0, "rgba(120, 200, 255, 0.16)");
      g.addColorStop(1, "rgba(120, 200, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, 34 * laneBoost, 0, Math.PI * 2);
      ctx.fill();
    });

    snapshot.debug.lanes.forEach((lane, idx) => {
      ctx.strokeStyle = idx === 1 ? "rgba(120, 200, 255, 0.3)" : "rgba(100, 140, 200, 0.18)";
      ctx.lineWidth = idx === 1 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(34, lane.y + idx * 4);
      ctx.lineTo(width - 34, lane.y + idx * 4);
      ctx.stroke();
    });

    const cool = ctx.createLinearGradient(0, 0, 0, height);
    cool.addColorStop(0, "rgba(80, 130, 200, 0.08)");
    cool.addColorStop(1, "rgba(60, 80, 120, 0.06)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,6,20,0.4)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
};
