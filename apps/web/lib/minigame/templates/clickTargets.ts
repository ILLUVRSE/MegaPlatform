import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { clamp, circleIntersectsCircle } from "../runtime/collision";
import { drawCircle, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

type Target = { x: number; y: number; r: number; wobble: number };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:CLICK_TARGETS`);
  return {
    id: `CLICK_TARGETS-${seed}`,
    seed,
    templateId: "CLICK_TARGETS",
    title: "Click Frenzy",
    tagline: "Pop pop pop.",
    instructions: "Click the targets quickly. Misses cost you time.",
    durationSeconds: 30,
    inputSchema: {
      keys: [],
      mouse: { enabled: true }
    },
    winCondition: { type: "targets", target: 20 },
    loseCondition: { type: "timer" },
    scoring: { mode: "winlose" },
    theme,
    params: {
      targetCount: 20,
      targetSize: rng.nextFloat(26, 38) - difficulty * 2,
      spawnInterval: rng.nextFloat(0.55, 0.95) - difficulty * 0.04,
      missPenaltySeconds: rng.nextFloat(1, 1.8)
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  const targets: Target[] = [];
  let hits = 0;
  let spawnTimer = 0;

  const palette = getPaletteById(spec.theme.palette);

  const spawnTarget = () => {
    if (targets.length >= 6) return;
    const margin = spec.params.targetSize + 10;
    targets.push({
      x: ctx.rng.nextFloat(margin, ctx.width - margin),
      y: ctx.rng.nextFloat(margin, ctx.height - margin),
      r: spec.params.targetSize,
      wobble: ctx.rng.nextFloat(0, Math.PI * 2)
    });
  };

  return {
    init(runtime) {
      ctx = runtime;
    },
    applyInput(input: InputSnapshot) {
      if (!input.mouse.clicked) return;
      let hitIndex = -1;
      for (let i = 0; i < targets.length; i += 1) {
        const target = targets[i];
        if (circleIntersectsCircle({ x: input.mouse.x, y: input.mouse.y, r: 1 }, target)) {
          hitIndex = i;
          break;
        }
      }
      if (hitIndex >= 0) {
        const target = targets[hitIndex];
        targets.splice(hitIndex, 1);
        hits += 1;
        ctx.setStatus(`Pop! ${hits}/${spec.params.targetCount}`);
        if (target) {
          ctx.effects.spawnParticles(target.x, target.y, palette.colors.accent, 18);
        }
        ctx.effects.flash(palette.colors.accent, 0.06);
        ctx.playSfx("ding");
      } else {
        ctx.adjustTime(-spec.params.missPenaltySeconds);
        ctx.setStatus("Miss! Time penalty.");
        ctx.effects.shake(0.12, 4);
        ctx.playSfx("hit");
      }
    },
    step(dt: number) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTarget();
        spawnTimer = spec.params.spawnInterval;
      }

      if (spec.modifiers.includes("jitteryTargets")) {
        for (const target of targets) {
          target.wobble += dt * 4;
          target.x += Math.cos(target.wobble) * dt * 20;
          target.y += Math.sin(target.wobble) * dt * 20;
          target.x = clamp(target.x, target.r, ctx.width - target.r);
          target.y = clamp(target.y, target.r, ctx.height - target.r);
        }
      }

      if (hits >= spec.params.targetCount) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("win");
        }
        ctx.setResult("win");
      } else if (ctx.getTimeRemaining() <= 0) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("lose");
        }
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      for (const target of targets) {
        drawCircle(renderCtx, target.x, target.y, target.r, palette.colors.accent);
        drawCircle(renderCtx, target.x, target.y, target.r * 0.5, palette.colors.backgroundSecondary);
      }
      drawText(
        renderCtx,
        `Hits ${hits}/${spec.params.targetCount}`,
        ctx.width - 120,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Click ${spec.params.targetCount} targets before the timer hits zero.`;
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.targetCount}`;
    },
    serializeState() {
      return { hits, targets };
    },
    getScore() {
      return hits;
    },
    hydrateState(state) {
      const next = state as { hits?: number; targets?: Target[] } | null;
      if (!next) return;
      if (typeof next.hits === "number") {
        hits = next.hits;
      }
      if (Array.isArray(next.targets)) {
        targets.length = 0;
        next.targets.forEach((target) => {
          if (target && typeof target.x === "number" && typeof target.y === "number") {
            targets.push({ ...target });
          }
        });
      }
    }
  };
};
