import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { drawMeter, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:TIMING_BAR`);
  return {
    id: `TIMING_BAR-${seed}`,
    seed,
    templateId: "TIMING_BAR",
    title: "Timing Terror",
    tagline: "Hit the green, avoid shame.",
    instructions: "Press Space when the needle hits the green zone.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["Space"],
      mouse: { enabled: false }
    },
    winCondition: { type: "perfects", target: 6 },
    loseCondition: { type: "misses", maxMisses: 5 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      requiredHits: Math.round(rng.nextFloat(5, 8) + difficulty),
      needleSpeed: rng.nextFloat(1.4, 2.2) + difficulty * 0.1,
      greenZoneSize: rng.nextFloat(0.14, 0.22) - difficulty * 0.01,
      maxMisses: Math.round(rng.nextFloat(4, 6) - difficulty * 0.3)
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let needle = 0.1;
  let direction = 1;
  let hits = 0;
  let misses = 0;
  let zoneCenter = 0.5;

  const palette = getPaletteById(spec.theme.palette);

  const zoneSize = () => spec.params.greenZoneSize;
  const updateZone = () => {
    zoneCenter = ctx.rng.nextFloat(0.2, 0.8);
  };

  return {
    init(runtime) {
      ctx = runtime;
      updateZone();
    },
    applyInput(input: InputSnapshot) {
      if (!input.keysPressed.Space) return;
      const zoneHalf = zoneSize() / 2;
      if (needle >= zoneCenter - zoneHalf && needle <= zoneCenter + zoneHalf) {
        hits += 1;
        ctx.setStatus(`Perfect ${hits}/${spec.params.requiredHits}!`);
        ctx.effects.flash(palette.colors.accent, 0.08);
        ctx.playSfx("ding");
        updateZone();
      } else {
        misses += 1;
        ctx.setStatus(`Miss ${misses}/${spec.params.maxMisses}`);
        ctx.effects.shake(0.1, 4);
        ctx.playSfx("hit");
      }
    },
    step(dt: number) {
      const speedMultiplier = spec.modifiers.includes("fastNeedle") ? 1.25 : 1;
      const speed = spec.params.needleSpeed * speedMultiplier;
      needle += direction * speed * dt;
      if (needle >= 1) {
        needle = 1;
        direction = -1;
      } else if (needle <= 0) {
        needle = 0;
        direction = 1;
      }

      if (hits >= spec.params.requiredHits) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("win");
        }
        ctx.setResult("win");
      } else if (misses > spec.params.maxMisses) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("lose");
        }
        ctx.setResult("lose");
      } else if (ctx.getTimeRemaining() <= 0) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("lose");
        }
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      const width = 700;
      const height = 24;
      const x = (ctx.width - width) / 2;
      const y = ctx.height / 2;
      drawMeter(renderCtx, x, y, width, height, 1, 1, "rgba(255,255,255,0.1)", "rgba(255,255,255,0.1)");

      const zoneHalf = zoneSize() / 2;
      const zoneX = x + (zoneCenter - zoneHalf) * width;
      renderCtx.save();
      renderCtx.fillStyle = palette.colors.accent;
      renderCtx.fillRect(zoneX, y, zoneHalf * 2 * width, height);
      renderCtx.restore();

      const needleX = x + needle * width;
      renderCtx.save();
      renderCtx.strokeStyle = palette.colors.text;
      renderCtx.lineWidth = 4;
      renderCtx.beginPath();
      renderCtx.moveTo(needleX, y - 8);
      renderCtx.lineTo(needleX, y + height + 8);
      renderCtx.stroke();
      renderCtx.restore();

      drawText(
        renderCtx,
        `Perfects ${hits}/${spec.params.requiredHits}`,
        ctx.width / 2,
        y - 60,
        20,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Hit Space in the green zone ${spec.params.requiredHits} times.`;
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.requiredHits} • Misses ${misses}/${spec.params.maxMisses}`;
    },
    serializeState() {
      return { hits, misses, needle, direction, zoneCenter };
    },
    getScore() {
      return hits;
    },
    hydrateState(state) {
      const next = state as {
        hits?: number;
        misses?: number;
        needle?: number;
        direction?: number;
        zoneCenter?: number;
      } | null;
      if (!next) return;
      if (typeof next.hits === "number") hits = next.hits;
      if (typeof next.misses === "number") misses = next.misses;
      if (typeof next.needle === "number") needle = next.needle;
      if (typeof next.direction === "number") direction = next.direction;
      if (typeof next.zoneCenter === "number") zoneCenter = next.zoneCenter;
    }
  };
};
