import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { drawText, drawCircle } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

const LANES = [260, 540, 820];

type Hazard = { lane: number; y: number; speed: number };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:LANE_DODGER`);
  return {
    id: `LANE_DODGER-${seed}`,
    seed,
    templateId: "LANE_DODGER",
    title: "Lane Panic",
    tagline: "Pick a lane. Survive the surge.",
    instructions: "Move left/right between lanes to dodge incoming hazards.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"],
      mouse: { enabled: false }
    },
    winCondition: { type: "survive", target: 30 },
    loseCondition: { type: "hits", maxMisses: 3 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      laneSpeed: rng.nextFloat(200, 260) + difficulty * 20,
      spawnInterval: rng.nextFloat(0.5, 0.8) - difficulty * 0.05,
      maxHits: 3
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let laneIndex = 1;
  let hits = 0;
  let spawnTimer = 0;
  const hazards: Hazard[] = [];

  const palette = getPaletteById(spec.theme.palette);

  return {
    init(runtime) {
      ctx = runtime;
    },
    applyInput(input: InputSnapshot) {
      const mirror = spec.modifiers.includes("mirrorControls");
      if (input.keysPressed.ArrowLeft || input.keysPressed.KeyA) {
        laneIndex = mirror ? Math.min(2, laneIndex + 1) : Math.max(0, laneIndex - 1);
      }
      if (input.keysPressed.ArrowRight || input.keysPressed.KeyD) {
        laneIndex = mirror ? Math.max(0, laneIndex - 1) : Math.min(2, laneIndex + 1);
      }
    },
    step(dt: number) {
      const lateBoost = ctx.getTimeRemaining() <= 10 ? 1.25 : 1;
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        hazards.push({
          lane: ctx.rng.nextInt(0, 2),
          y: -40,
          speed: spec.params.laneSpeed * lateBoost
        });
        spawnTimer = spec.params.spawnInterval * (lateBoost > 1 ? 0.8 : 1);
      }

      for (const hazard of hazards) {
        hazard.y += hazard.speed * dt;
      }

      for (let i = hazards.length - 1; i >= 0; i -= 1) {
        const hazard = hazards[i];
        if (hazard.y > ctx.height + 40) {
          hazards.splice(i, 1);
          continue;
        }
        if (hazard.lane === laneIndex && hazard.y > 460 && hazard.y < 540) {
          hits += 1;
          hazards.splice(i, 1);
          ctx.effects.shake(0.12, 5);
          ctx.effects.flash(palette.colors.danger, 0.08);
          ctx.playSfx("hit");
          if (hits >= spec.params.maxHits) {
            ctx.playSfx("lose");
            ctx.setResult("lose");
          }
        }
      }

      if (ctx.getTimeRemaining() <= 0 && hits < spec.params.maxHits) {
        ctx.playSfx("win");
        ctx.setResult("win");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      renderCtx.save();
      renderCtx.strokeStyle = palette.colors.accentSoft;
      renderCtx.lineWidth = 4;
      renderCtx.strokeRect(200, 80, 680, 460);
      renderCtx.restore();

      for (const laneX of LANES) {
        renderCtx.save();
        renderCtx.strokeStyle = "rgba(255,255,255,0.15)";
        renderCtx.beginPath();
        renderCtx.moveTo(laneX, 100);
        renderCtx.lineTo(laneX, 520);
        renderCtx.stroke();
        renderCtx.restore();
      }

      for (const hazard of hazards) {
        drawCircle(renderCtx, LANES[hazard.lane], hazard.y, 26, palette.colors.danger);
      }

      drawCircle(renderCtx, LANES[laneIndex], 520, 28, palette.colors.accent);
      drawText(
        renderCtx,
        `Hits ${hits}/${spec.params.maxHits}`,
        ctx.width - 140,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return "Dodge the lane hazards for 30 seconds.";
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.maxHits}`;
    },
    serializeState() {
      return { hits, laneIndex, hazards };
    },
    getScore() {
      return spec.durationSeconds - ctx.getTimeRemaining();
    },
    hydrateState(state) {
      const next = state as { hits?: number; laneIndex?: number; hazards?: Hazard[] } | null;
      if (!next) return;
      if (typeof next.hits === "number") hits = next.hits;
      if (typeof next.laneIndex === "number") laneIndex = next.laneIndex;
      if (Array.isArray(next.hazards)) {
        hazards.length = 0;
        next.hazards.forEach((hazard) => {
          if (hazard && typeof hazard.lane === "number" && typeof hazard.y === "number") {
            hazards.push({ ...hazard });
          }
        });
      }
    }
  };
};
