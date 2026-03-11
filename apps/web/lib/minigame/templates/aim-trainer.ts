import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { drawCircle, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:AIM_TRAINER_FLICK`);
  return {
    id: `AIM_TRAINER_FLICK-${seed}`,
    seed,
    templateId: "AIM_TRAINER_FLICK",
    title: "Flick Shot Frenzy",
    tagline: "Snap, click, repeat.",
    instructions: "Click targets before they shrink away.",
    durationSeconds: 30,
    inputSchema: {
      keys: [],
      mouse: { enabled: true }
    },
    winCondition: { type: "hits", target: 20 },
    loseCondition: { type: "timer" },
    scoring: { mode: "winlose" },
    theme,
    params: {
      targetCount: Math.round(rng.nextFloat(18, 24) + difficulty * 2),
      targetSize: rng.nextFloat(40, 60) - difficulty * 3,
      shrinkRate: rng.nextFloat(0.8, 1.2) + difficulty * 0.05,
      spawnInterval: rng.nextFloat(0.4, 0.7) - difficulty * 0.05
    },
    modifiers: []
  };
};

type Target = { x: number; y: number; r: number; alive: boolean };

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let hits = 0;
  let spawnTimer = 0;
  let target: Target | null = null;

  const palette = getPaletteById(spec.theme.palette);

  const spawnTarget = () => {
    const margin = 80;
    target = {
      x: ctx.rng.nextFloat(margin, ctx.width - margin),
      y: ctx.rng.nextFloat(120, ctx.height - margin),
      r: spec.params.targetSize,
      alive: true
    };
  };

  return {
    init(runtime) {
      ctx = runtime;
      spawnTarget();
    },
    applyInput(input: InputSnapshot) {
      if (!input.mouse.clicked || !target?.alive) return;
      const dx = input.mouse.x - target.x;
      const dy = input.mouse.y - target.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= target.r) {
        hits += 1;
        target.alive = false;
        ctx.effects.flash(palette.colors.accent, 0.08);
        ctx.effects.spawnParticles(target.x, target.y, palette.colors.accent, 18);
        ctx.playSfx("ding");
      } else {
        ctx.effects.shake(0.08, 3);
        ctx.playSfx("hit");
      }
    },
    step(dt: number) {
      spawnTimer -= dt;
      if (!target || !target.alive) {
        if (spawnTimer <= 0) {
          spawnTarget();
          spawnTimer = spec.params.spawnInterval;
        }
      } else {
        const lateBoost = ctx.getTimeRemaining() <= 10 ? 1.25 : 1;
        target.r = Math.max(10, target.r - spec.params.shrinkRate * dt * 20 * lateBoost);
        if (target.r <= 12) {
          target.alive = false;
          ctx.effects.flash(palette.colors.danger, 0.06);
          ctx.playSfx("hit");
        }
      }

      if (hits >= spec.params.targetCount) {
        ctx.playSfx("win");
        ctx.setResult("win");
      } else if (ctx.getTimeRemaining() <= 0) {
        ctx.playSfx("lose");
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      if (target?.alive) {
        drawCircle(renderCtx, target.x, target.y, target.r, palette.colors.accent);
        drawCircle(renderCtx, target.x, target.y, target.r * 0.45, palette.colors.backgroundSecondary);
      }
      drawText(
        renderCtx,
        `Hits ${hits}/${spec.params.targetCount}`,
        ctx.width - 140,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Hit ${spec.params.targetCount} targets before they shrink away.`;
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.targetCount}`;
    },
    serializeState() {
      return { hits, target };
    },
    getScore() {
      return hits;
    },
    hydrateState(state) {
      const next = state as { hits?: number; target?: Target | null } | null;
      if (!next) return;
      if (typeof next.hits === "number") hits = next.hits;
      if (next.target === null) {
        target = null;
      } else if (next.target) {
        target = { ...next.target };
      }
    }
  };
};
