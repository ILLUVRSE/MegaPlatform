import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { circleIntersectsCircle, clamp } from "../runtime/collision";
import { drawCircle, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

type Hazard = { x: number; y: number; vx: number; vy: number; r: number };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:DODGE_SURVIVE`);
  return {
    id: `DODGE_SURVIVE-${seed}`,
    seed,
    templateId: "DODGE_SURVIVE",
    title: "Dodge Panic",
    tagline: "No hits, no regrets.",
    instructions: "Dodge hazards for 30 seconds. Three hits and you lose.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
      mouse: { enabled: false }
    },
    winCondition: { type: "survive", target: 30 },
    loseCondition: { type: "hits", maxMisses: 3 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      maxHits: 3,
      hazardSpeed: rng.nextFloat(140, 210) + difficulty * 14,
      hazardSize: rng.nextFloat(20, 30) + difficulty * 1.5,
      spawnRate: rng.nextFloat(0.8, 1.2) + difficulty * 0.1,
      spawnRamp: rng.nextFloat(0.2, 0.5),
      playerSpeed: rng.nextFloat(200, 240)
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  const hazards: Hazard[] = [];
  const player = { x: 0, y: 0, vx: 0, vy: 0, r: 20 };
  let hits = 0;
  let spawnTimer = 0;
  let burstTimer = 10;

  const palette = getPaletteById(spec.theme.palette);

  const spawnHazard = () => {
    const edge = ctx.rng.nextInt(0, 3);
    const speed = spec.params.hazardSpeed * ctx.rng.nextFloat(0.8, 1.2);
    const r = spec.params.hazardSize;
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = ctx.rng.nextFloat(0, ctx.width);
      y = -r;
    } else if (edge === 1) {
      x = ctx.width + r;
      y = ctx.rng.nextFloat(0, ctx.height);
    } else if (edge === 2) {
      x = ctx.rng.nextFloat(0, ctx.width);
      y = ctx.height + r;
    } else {
      x = -r;
      y = ctx.rng.nextFloat(0, ctx.height);
    }
    const angle = Math.atan2(ctx.height / 2 - y, ctx.width / 2 - x);
    hazards.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r
    });
  };

  return {
    init(runtime) {
      ctx = runtime;
      player.x = ctx.width / 2;
      player.y = ctx.height / 2;
    },
    applyInput(input: InputSnapshot) {
      const speed = spec.params.playerSpeed;
      const mirror = spec.modifiers.includes("mirrorControls");
      const axis = mirror ? -1 : 1;
      const up = input.keysDown.ArrowUp || input.keysDown.KeyW;
      const down = input.keysDown.ArrowDown || input.keysDown.KeyS;
      const left = input.keysDown.ArrowLeft || input.keysDown.KeyA;
      const right = input.keysDown.ArrowRight || input.keysDown.KeyD;

      const targetVx = (right ? 1 : 0) - (left ? 1 : 0);
      const targetVy = (down ? 1 : 0) - (up ? 1 : 0);

      player.vx = targetVx * speed * axis;
      player.vy = targetVy * speed;

      if (spec.modifiers.includes("slipperyFriction")) {
        player.vx *= 0.9;
        player.vy *= 0.9;
      }
      if (spec.modifiers.includes("lowGravity")) {
        player.vx *= 0.85;
        player.vy *= 0.85;
      }
    },
    step(dt: number) {
      player.x = clamp(player.x + player.vx * dt, player.r, ctx.width - player.r);
      player.y = clamp(player.y + player.vy * dt, player.r, ctx.height - player.r);

      spawnTimer -= dt;
      const rate = spec.params.spawnRate +
        (1 - ctx.getTimeRemaining() / spec.durationSeconds) * spec.params.spawnRamp;

      if (spawnTimer <= 0) {
        spawnHazard();
        spawnTimer = 1 / rate;
      }

      if (spec.modifiers.includes("spawnBurstEvery10s")) {
        burstTimer -= dt;
        if (burstTimer <= 0) {
          for (let i = 0; i < 3; i += 1) spawnHazard();
          burstTimer = 10;
        }
      }

      for (const hazard of hazards) {
        hazard.x += hazard.vx * dt;
        hazard.y += hazard.vy * dt;
      }

      for (let i = hazards.length - 1; i >= 0; i -= 1) {
        const hazard = hazards[i];
        if (hazard.x < -100 || hazard.x > ctx.width + 100 || hazard.y < -100 || hazard.y > ctx.height + 100) {
          hazards.splice(i, 1);
          continue;
        }
        if (circleIntersectsCircle(player, hazard)) {
          hits += 1;
          ctx.setStatus(`Ouch! Hits ${hits}/${spec.params.maxHits}`);
          ctx.effects.shake(0.2, 6);
          ctx.effects.flash(palette.colors.danger, 0.1);
          ctx.playSfx("hit");
          hazards.splice(i, 1);
          if (hits >= spec.params.maxHits) {
            if (!ctx.isGameOver()) {
              ctx.playSfx("lose");
            }
            ctx.setResult("lose");
          }
        }
      }

      if (ctx.getTimeRemaining() <= 0 && hits < spec.params.maxHits) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("win");
        }
        ctx.setResult("win");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      drawCircle(renderCtx, player.x, player.y, player.r, palette.colors.accent);
      for (const hazard of hazards) {
        drawCircle(renderCtx, hazard.x, hazard.y, hazard.r, palette.colors.danger);
      }
      drawText(renderCtx, `Hits: ${hits}/${spec.params.maxHits}`, ctx.width - 100, 40, 16, palette.colors.text);
    },
    getObjectiveText() {
      return "Survive the full 30 seconds. Three hits and you're toast.";
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.maxHits}`;
    },
    serializeState() {
      return { hits, player, hazards };
    },
    getScore() {
      return spec.durationSeconds - ctx.getTimeRemaining();
    },
    hydrateState(state) {
      const next = state as { hits?: number; player?: typeof player; hazards?: Hazard[] } | null;
      if (!next) return;
      if (typeof next.hits === "number") hits = next.hits;
      if (next.player) {
        player.x = next.player.x ?? player.x;
        player.y = next.player.y ?? player.y;
        player.vx = next.player.vx ?? player.vx;
        player.vy = next.player.vy ?? player.vy;
        player.r = next.player.r ?? player.r;
      }
      if (Array.isArray(next.hazards)) {
        hazards.length = 0;
        next.hazards.forEach((hazard) => {
          if (hazard && typeof hazard.x === "number" && typeof hazard.y === "number") {
            hazards.push({ ...hazard });
          }
        });
      }
    }
  };
};
