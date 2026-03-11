const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export const temple = {
  id: "temple",
  displayName: "Classic Tournament Temple",
  load() {},
  create(scene) {
    const { width, height } = scene;
    const layers = {
      far: makeCanvas(width, height),
      city: makeCanvas(width, height),
      signage: makeCanvas(width, height),
      pillars: makeCanvas(width, height),
      fg: makeCanvas(width, height),
      hero: makeCanvas(220, 220),
      floor: makeCanvas(width, height)
    };

    const far = layers.far.getContext("2d");
    const farG = far.createLinearGradient(0, 0, 0, height);
    farG.addColorStop(0, "#1b1420");
    farG.addColorStop(0.5, "#2a1f24");
    farG.addColorStop(1, "#20161a");
    far.fillStyle = farG;
    far.fillRect(0, 0, width, height);
    for (let i = 0; i < 50; i += 1) {
      far.fillStyle = `rgba(255, 220, 180, ${0.08 + Math.random() * 0.15})`;
      far.fillRect(Math.random() * width, Math.random() * height * 0.28, 1, 1);
    }

    const city = layers.city.getContext("2d");
    city.fillStyle = "#1e1416";
    city.fillRect(0, height * 0.22, width, height * 0.26);
    for (let i = 0; i < 8; i += 1) {
      const w = 120 + Math.random() * 80;
      const h = 50 + Math.random() * 90;
      const x = (i * 160 + Math.random() * 50) % width;
      const y = height * 0.47 - h;
      city.fillStyle = "#1a1012";
      city.fillRect(x, y, w, h);
      city.fillStyle = "rgba(255, 200, 150, 0.08)";
      city.fillRect(x + 10, y + 8, w * 0.5, 6);
    }

    const signage = layers.signage.getContext("2d");
    for (let i = 0; i < 6; i += 1) {
      const w = 80 + Math.random() * 40;
      const h = 16 + Math.random() * 10;
      const x = (i * 140 + Math.random() * 70) % width;
      const y = height * (0.18 + Math.random() * 0.12);
      signage.fillStyle = "rgba(255, 190, 120, 0.25)";
      signage.fillRect(x, y, w, h);
    }

    const pillars = layers.pillars.getContext("2d");
    pillars.fillStyle = "rgba(40, 24, 22, 0.9)";
    for (let i = 0; i < 6; i += 1) {
      const x = i * (width / 5);
      pillars.fillRect(x - 12, height * 0.22, 24, height * 0.42);
    }

    const fg = layers.fg.getContext("2d");
    fg.strokeStyle = "rgba(255, 210, 150, 0.18)";
    for (let i = 0; i < 5; i += 1) {
      const y = height * (0.12 + i * 0.07);
      fg.beginPath();
      fg.moveTo(0, y);
      fg.lineTo(width, y + 4);
      fg.stroke();
    }

    const hero = layers.hero.getContext("2d");
    hero.translate(110, 110);
    hero.strokeStyle = "rgba(255, 200, 140, 0.5)";
    hero.lineWidth = 6;
    hero.beginPath();
    hero.arc(0, 0, 70, 0, Math.PI * 2);
    hero.stroke();
    hero.strokeStyle = "rgba(255, 140, 90, 0.35)";
    hero.lineWidth = 4;
    hero.beginPath();
    hero.moveTo(-30, -10);
    hero.lineTo(30, -10);
    hero.moveTo(-10, 20);
    hero.lineTo(10, 20);
    hero.stroke();

    const floor = layers.floor.getContext("2d");
    const floorTop = height * 0.54;
    const g = floor.createLinearGradient(0, floorTop, 0, height);
    g.addColorStop(0, "#2a1b18");
    g.addColorStop(0.7, "#1e1312");
    g.addColorStop(1, "#140d0c");
    floor.fillStyle = g;
    floor.fillRect(0, floorTop, width, height * 0.46);

    const lanterns = Array.from({ length: 6 }, (_, i) => ({
      x: width * (0.15 + i * 0.13),
      y: height * 0.2,
      phase: Math.random() * Math.PI * 2
    }));

    return {
      layers,
      lanterns,
      petals: Array.from({ length: 20 }, () => ({
        x: Math.random() * width,
        y: height * (0.2 + Math.random() * 0.35),
        vx: -0.2 + Math.random() * 0.4,
        vy: 0.15 + Math.random() * 0.3,
        a: 0.2 + Math.random() * 0.25
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

    drawLayer(state.layers.far, 1.2);
    drawLayer(state.layers.city, 3.5);
    drawLayer(state.layers.signage, 6, Math.sin(t * 0.3) * 2);
    drawLayer(state.layers.pillars, 9);
    drawLayer(state.layers.fg, 12);

    const heroPulse = 0.98 + Math.sin(t * 0.5) * 0.02;
    const heroFlicker = Math.random() > 0.997 ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = 0.38 * heroFlicker;
    ctx.translate(width * 0.5, height * 0.33);
    ctx.scale(heroPulse, heroPulse);
    ctx.drawImage(state.layers.hero, -110, -110);
    ctx.restore();

    state.lanterns.forEach((l) => {
      const sway = Math.sin(t * 0.8 + l.phase) * 6;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(sway * 0.01);
      ctx.fillStyle = "rgba(255, 180, 120, 0.6)";
      ctx.fillRect(-6, 0, 12, 20);
      ctx.restore();
    });

    const floorTop = height * 0.54;
    ctx.drawImage(state.layers.floor, 0, 0);

    ctx.strokeStyle = "rgba(255, 200, 160, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const x = 36 + i * ((width - 72) / 10);
      ctx.beginPath();
      ctx.moveTo(x, floorTop + 12);
      ctx.lineTo(width * 0.5 + (x - width * 0.5) * 1.2, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 180, 120, 0.12)";
    ctx.beginPath();
    ctx.moveTo(40, floorTop + 18);
    ctx.lineTo(width - 40, floorTop + 18);
    ctx.stroke();

    const scan = ctx.createLinearGradient(0, floorTop, width, floorTop);
    const scanPos = (t * 12) % width;
    scan.addColorStop(0, "rgba(255,255,255,0)");
    scan.addColorStop(Math.max(0, scanPos / width - 0.05), "rgba(255, 220, 180, 0)");
    scan.addColorStop(scanPos / width, "rgba(255, 220, 180, 0.08)");
    scan.addColorStop(Math.min(1, scanPos / width + 0.05), "rgba(255, 220, 180, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(0, floorTop, width, height - floorTop);

    [snapshot.p1, snapshot.p2].forEach((f) => {
      const laneBoost = f.lane === "front" ? 1.2 : f.lane === "back" ? 0.7 : 1;
      const g = ctx.createRadialGradient(f.x, f.y + 6, 4, f.x, f.y + 6, 34 * laneBoost);
      g.addColorStop(0, "rgba(255, 200, 150, 0.16)");
      g.addColorStop(1, "rgba(255, 200, 150, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, 34 * laneBoost, 0, Math.PI * 2);
      ctx.fill();
    });

    state.petals.forEach((p) => {
      p.y -= p.vy * dt * 60;
      p.x += p.vx * dt * 60;
      if (p.y < height * 0.12 || p.x < -20 || p.x > width + 20) {
        p.y = height * (0.35 + Math.random() * 0.2);
        p.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 210, 180, ${p.a})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4, 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    snapshot.debug.lanes.forEach((lane, idx) => {
      ctx.strokeStyle = idx === 1 ? "rgba(255, 200, 160, 0.32)" : "rgba(200, 170, 150, 0.18)";
      ctx.lineWidth = idx === 1 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(34, lane.y + idx * 4);
      ctx.lineTo(width - 34, lane.y + idx * 4);
      ctx.stroke();
    });

    const warm = ctx.createLinearGradient(0, 0, 0, height);
    warm.addColorStop(0, "rgba(255, 200, 150, 0.1)");
    warm.addColorStop(1, "rgba(120, 60, 40, 0.06)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,6,20,0.4)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
};
