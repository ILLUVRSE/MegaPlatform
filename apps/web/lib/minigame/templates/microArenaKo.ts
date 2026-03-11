import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { circleIntersectsCircle } from "../runtime/collision";
import { drawCircle, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

type Fighter = { x: number; y: number; vx: number; vy: number; r: number };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:MICRO_ARENA_KO`);
  return {
    id: `MICRO_ARENA_KO-${seed}`,
    seed,
    templateId: "MICRO_ARENA_KO",
    title: "Arena Bump Royale",
    tagline: "Bump or be bumped.",
    instructions: "Knock enemies out of the arena. Two falls and you're out.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"],
      mouse: { enabled: false }
    },
    winCondition: { type: "kos", target: 5 },
    loseCondition: { type: "falls", maxMisses: 2 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      kosToWin: 5,
      enemyCount: Math.round(rng.nextFloat(5, 7) + difficulty * 0.2),
      enemySpeed: rng.nextFloat(100, 140) + difficulty * 5,
      playerSpeed: rng.nextFloat(200, 240),
      knockoutLimit: 2
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  const player: Fighter = { x: 0, y: 0, vx: 0, vy: 0, r: 20 };
  const enemies: Fighter[] = [];
  let enemyKOs = 0;
  let playerKOs = 0;

  const palette = getPaletteById(spec.theme.palette);

  const arena = {
    x: 120,
    y: 80,
    width: 840,
    height: 440
  };

  const spawnEnemies = () => {
    enemies.length = 0;
    for (let i = 0; i < spec.params.enemyCount; i += 1) {
      const angle = ctx.rng.nextFloat(0, Math.PI * 2);
      enemies.push({
        x: ctx.rng.nextFloat(arena.x + 40, arena.x + arena.width - 40),
        y: ctx.rng.nextFloat(arena.y + 40, arena.y + arena.height - 40),
        vx: Math.cos(angle) * spec.params.enemySpeed,
        vy: Math.sin(angle) * spec.params.enemySpeed,
        r: 18
      });
    }
  };

  const resetPlayer = () => {
    player.x = ctx.width / 2;
    player.y = ctx.height / 2;
    player.vx = 0;
    player.vy = 0;
  };

  return {
    init(runtime) {
      ctx = runtime;
      resetPlayer();
      spawnEnemies();
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
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      for (const enemy of enemies) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;

        if (enemy.x < arena.x + enemy.r || enemy.x > arena.x + arena.width - enemy.r) {
          enemy.vx *= -1;
        }
        if (enemy.y < arena.y + enemy.r || enemy.y > arena.y + arena.height - enemy.r) {
          enemy.vy *= -1;
        }
      }

      for (const enemy of enemies) {
        if (circleIntersectsCircle(player, enemy)) {
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const magnitude = Math.max(1, Math.hypot(dx, dy));
          const push = spec.modifiers.includes("bouncePhysics") ? 420 : 300;
          const nx = dx / magnitude;
          const ny = dy / magnitude;
          enemy.vx += nx * push;
          enemy.vy += ny * push;
          player.vx -= nx * push * 0.4;
          player.vy -= ny * push * 0.4;
          ctx.effects.shake(0.12, 5);
          ctx.playSfx("hit");
        }
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        if (
          enemy.x < arena.x - enemy.r ||
          enemy.x > arena.x + arena.width + enemy.r ||
          enemy.y < arena.y - enemy.r ||
          enemy.y > arena.y + arena.height + enemy.r
        ) {
          enemies.splice(i, 1);
          enemyKOs += 1;
          ctx.setStatus(`KO! ${enemyKOs}/${spec.params.kosToWin}`);
          ctx.effects.spawnParticles(enemy.x, enemy.y, palette.colors.accent, 18);
          ctx.playSfx("ding");
        }
      }

      if (
        player.x < arena.x - player.r ||
        player.x > arena.x + arena.width + player.r ||
        player.y < arena.y - player.r ||
        player.y > arena.y + arena.height + player.r
      ) {
        playerKOs += 1;
        ctx.setStatus(`You got bounced! ${playerKOs}/${spec.params.knockoutLimit}`);
        ctx.effects.flash(palette.colors.danger, 0.1);
        ctx.playSfx("hit");
        resetPlayer();
        if (playerKOs >= spec.params.knockoutLimit) {
          if (!ctx.isGameOver()) {
            ctx.playSfx("lose");
          }
          ctx.setResult("lose");
        }
      }

      if (enemyKOs >= spec.params.kosToWin) {
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
      renderCtx.save();
      renderCtx.strokeStyle = palette.colors.accentSoft;
      renderCtx.lineWidth = 3;
      renderCtx.strokeRect(arena.x, arena.y, arena.width, arena.height);
      renderCtx.restore();

      for (const enemy of enemies) {
        drawCircle(renderCtx, enemy.x, enemy.y, enemy.r, palette.colors.danger);
      }
      drawCircle(renderCtx, player.x, player.y, player.r, palette.colors.accent);
      drawText(
        renderCtx,
        `KOs ${enemyKOs}/${spec.params.kosToWin}`,
        ctx.width - 120,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Knock ${spec.params.kosToWin} enemies out without falling twice.`;
    },
    getStatusText() {
      return `KOs ${enemyKOs}/${spec.params.kosToWin} • Falls ${playerKOs}/${spec.params.knockoutLimit}`;
    },
    serializeState() {
      return { enemyKOs, playerKOs, player, enemies, arena };
    },
    getScore() {
      return enemyKOs;
    },
    hydrateState(state) {
      const next = state as {
        enemyKOs?: number;
        playerKOs?: number;
        player?: Fighter;
        enemies?: Fighter[];
        arena?: typeof arena;
      } | null;
      if (!next) return;
      if (typeof next.enemyKOs === "number") enemyKOs = next.enemyKOs;
      if (typeof next.playerKOs === "number") playerKOs = next.playerKOs;
      if (next.player) {
        player.x = next.player.x ?? player.x;
        player.y = next.player.y ?? player.y;
        player.vx = next.player.vx ?? player.vx;
        player.vy = next.player.vy ?? player.vy;
        player.r = next.player.r ?? player.r;
      }
      if (Array.isArray(next.enemies)) {
        enemies.length = 0;
        next.enemies.forEach((enemy) => {
          if (enemy && typeof enemy.x === "number" && typeof enemy.y === "number") {
            enemies.push({ ...enemy });
          }
        });
      }
      if (next.arena) {
        arena.x = next.arena.x ?? arena.x;
        arena.y = next.arena.y ?? arena.y;
        arena.width = next.arena.width ?? arena.width;
        arena.height = next.arena.height ?? arena.height;
      }
    }
  };
};
