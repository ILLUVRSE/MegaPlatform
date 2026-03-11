import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { circleIntersectsCircle, circleIntersectsRect, clamp } from "../runtime/collision";
import { drawCircle, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

type Hazard = { x: number; y: number; vx: number; vy: number; r: number };

type Item = { x: number; y: number; r: number; collected: boolean };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:COLLECT_AND_ESCAPE`);
  return {
    id: `COLLECT_AND_ESCAPE-${seed}`,
    seed,
    templateId: "COLLECT_AND_ESCAPE",
    title: "Loot & Scoot",
    tagline: "Grab everything and dash.",
    instructions: "Collect all items, then reach the exit zone. Two hits and you're out.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
      mouse: { enabled: false }
    },
    winCondition: { type: "collect_exit", target: 10 },
    loseCondition: { type: "hits", maxMisses: 2 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      itemsToCollect: 10,
      hazardCount: Math.round(rng.nextFloat(2, 4) + difficulty * 0.2),
      hazardSpeed: rng.nextFloat(90, 130) + difficulty * 6,
      playerSpeed: rng.nextFloat(200, 235),
      exitSize: rng.nextFloat(90, 120)
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  const player = { x: 0, y: 0, vx: 0, vy: 0, r: 18 };
  const hazards: Hazard[] = [];
  const items: Item[] = [];
  let hits = 0;
  let collected = 0;

  const palette = getPaletteById(spec.theme.palette);

  const exitZone = {
    x: 0,
    y: 0,
    width: spec.params.exitSize,
    height: spec.params.exitSize
  };

  const spawnHazards = () => {
    hazards.length = 0;
    for (let i = 0; i < spec.params.hazardCount; i += 1) {
      const angle = ctx.rng.nextFloat(0, Math.PI * 2);
      hazards.push({
        x: ctx.rng.nextFloat(100, ctx.width - 100),
        y: ctx.rng.nextFloat(100, ctx.height - 100),
        vx: Math.cos(angle) * spec.params.hazardSpeed,
        vy: Math.sin(angle) * spec.params.hazardSpeed,
        r: 16
      });
    }
  };

  const spawnItems = () => {
    items.length = 0;
    for (let i = 0; i < spec.params.itemsToCollect; i += 1) {
      items.push({
        x: ctx.rng.nextFloat(80, ctx.width - 80),
        y: ctx.rng.nextFloat(80, ctx.height - 80),
        r: 12,
        collected: false
      });
    }
  };

  return {
    init(runtime) {
      ctx = runtime;
      player.x = ctx.width / 2;
      player.y = ctx.height / 2;
      exitZone.x = ctx.width - exitZone.width - 24;
      exitZone.y = ctx.height - exitZone.height - 24;
      spawnHazards();
      spawnItems();
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

      for (const hazard of hazards) {
        hazard.x += hazard.vx * dt;
        hazard.y += hazard.vy * dt;
        if (hazard.x < hazard.r || hazard.x > ctx.width - hazard.r) {
          hazard.vx *= -1;
        }
        if (hazard.y < hazard.r || hazard.y > ctx.height - hazard.r) {
          hazard.vy *= -1;
        }
        if (circleIntersectsCircle(player, hazard)) {
          hits += 1;
          ctx.setStatus(`Hit ${hits}/2`);
          ctx.effects.shake(0.18, 6);
          ctx.effects.flash(palette.colors.danger, 0.08);
          ctx.playSfx("hit");
          hazard.vx *= -1;
          hazard.vy *= -1;
          if (hits >= 2) {
            if (!ctx.isGameOver()) {
              ctx.playSfx("lose");
            }
            ctx.setResult("lose");
          }
        }
      }

      for (const item of items) {
        if (!item.collected && circleIntersectsCircle(player, item)) {
          item.collected = true;
          collected += 1;
          ctx.setStatus(`Collected ${collected}/${spec.params.itemsToCollect}`);
          ctx.effects.spawnParticles(item.x, item.y, palette.colors.accent, 16);
          ctx.playSfx("ding");
        }
      }

      if (collected >= spec.params.itemsToCollect) {
        if (circleIntersectsRect(player, exitZone)) {
          if (!ctx.isGameOver()) {
            ctx.playSfx("win");
          }
          ctx.setResult("win");
        }
      }

      if (ctx.getTimeRemaining() <= 0) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("lose");
        }
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      renderCtx.save();
      renderCtx.strokeStyle = palette.colors.accentSoft;
      renderCtx.lineWidth = 3;
      renderCtx.strokeRect(exitZone.x, exitZone.y, exitZone.width, exitZone.height);
      renderCtx.restore();

      for (const item of items) {
        if (!item.collected) {
          drawCircle(renderCtx, item.x, item.y, item.r, palette.colors.accent);
        }
      }

      for (const hazard of hazards) {
        drawCircle(renderCtx, hazard.x, hazard.y, hazard.r, palette.colors.danger);
      }

      drawCircle(renderCtx, player.x, player.y, player.r, palette.colors.text);

      drawText(
        renderCtx,
        `Items ${collected}/${spec.params.itemsToCollect}`,
        ctx.width - 140,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Collect ${spec.params.itemsToCollect} items, then reach the exit zone.`;
    },
    getStatusText() {
      return `Items ${collected}/${spec.params.itemsToCollect} • Hits ${hits}/2`;
    },
    serializeState() {
      return {
        player,
        hazards,
        items,
        collected,
        hits,
        exitZone
      };
    },
    getScore() {
      return collected;
    },
    hydrateState(state) {
      const next = state as {
        player?: typeof player;
        hazards?: Hazard[];
        items?: Item[];
        collected?: number;
        hits?: number;
        exitZone?: typeof exitZone;
      } | null;
      if (!next) return;
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
      if (Array.isArray(next.items)) {
        items.length = 0;
        next.items.forEach((item) => {
          if (item && typeof item.x === "number" && typeof item.y === "number") {
            items.push({ ...item });
          }
        });
      }
      if (typeof next.collected === "number") collected = next.collected;
      if (typeof next.hits === "number") hits = next.hits;
      if (next.exitZone) {
        exitZone.x = next.exitZone.x ?? exitZone.x;
        exitZone.y = next.exitZone.y ?? exitZone.y;
        exitZone.width = next.exitZone.width ?? exitZone.width;
        exitZone.height = next.exitZone.height ?? exitZone.height;
      }
    }
  };
};
