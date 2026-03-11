import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { clamp, circleIntersectsRect } from "../runtime/collision";
import { drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

type Brick = { x: number; y: number; width: number; height: number; alive: boolean };

type Ball = { x: number; y: number; vx: number; vy: number; r: number };

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:BREAKOUT_MICRO`);
  return {
    id: `BREAKOUT_MICRO-${seed}`,
    seed,
    templateId: "BREAKOUT_MICRO",
    title: "Breakout Blitz",
    tagline: "Bounce, break, repeat.",
    instructions: "Move the paddle, break the bricks, don't drop the ball.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"],
      mouse: { enabled: true }
    },
    winCondition: { type: "bricks", target: 14 },
    loseCondition: { type: "misses", maxMisses: 3 },
    scoring: { mode: "winlose" },
    theme,
    params: {
      bricksToClear: Math.round(rng.nextFloat(12, 16) + difficulty * 2),
      paddleWidth: rng.nextFloat(150, 200) - difficulty * 10,
      ballSpeed: rng.nextFloat(210, 280) + difficulty * 18,
      maxMisses: 3
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let paddleX = 0;
  const paddle = { y: 520, height: 16 };
  const bricks: Brick[] = [];
  const ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, r: 10 };
  let cleared = 0;
  let misses = 0;

  const palette = getPaletteById(spec.theme.palette);

  const resetBall = () => {
    ball.x = ctx.width / 2;
    ball.y = paddle.y - 30;
    const angle = ctx.rng.nextFloat(-0.8, -2.3);
    const speed = spec.params.ballSpeed;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  };

  const buildBricks = () => {
    bricks.length = 0;
    const cols = 6;
    const rows = 4;
    const totalWidth = 720;
    const brickWidth = totalWidth / cols;
    const brickHeight = 28;
    const startX = (ctx.width - totalWidth) / 2;
    const startY = 80;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        bricks.push({
          x: startX + col * brickWidth,
          y: startY + row * (brickHeight + 10),
          width: brickWidth - 8,
          height: brickHeight,
          alive: true
        });
      }
    }
  };

  return {
    init(runtime) {
      ctx = runtime;
      paddleX = ctx.width / 2;
      buildBricks();
      resetBall();
    },
    applyInput(input: InputSnapshot) {
      if (input.mouse.x || input.mouse.y) {
        paddleX = input.mouse.x;
      }
      const left = input.keysDown.ArrowLeft || input.keysDown.KeyA;
      const right = input.keysDown.ArrowRight || input.keysDown.KeyD;
      const speed = 380;
      if (left) paddleX -= speed * (1 / 60);
      if (right) paddleX += speed * (1 / 60);
    },
    step(dt: number) {
      const timeRemaining = ctx.getTimeRemaining();
      const lateBoost = timeRemaining <= 10 ? 1.25 : 1;
      ball.x += ball.vx * dt * lateBoost;
      ball.y += ball.vy * dt * lateBoost;

      const paddleWidth = spec.params.paddleWidth;
      paddleX = clamp(paddleX, paddleWidth / 2 + 40, ctx.width - paddleWidth / 2 - 40);

      if (ball.x < ball.r || ball.x > ctx.width - ball.r) {
        ball.vx *= -1;
      }
      if (ball.y < ball.r) {
        ball.vy *= -1;
      }

      const paddleRect = {
        x: paddleX - paddleWidth / 2,
        y: paddle.y,
        width: paddleWidth,
        height: paddle.height
      };

      if (circleIntersectsRect(ball, paddleRect) && ball.vy > 0) {
        ball.vy *= -1;
        const offset = (ball.x - paddleX) / (paddleWidth / 2);
        ball.vx += offset * 80;
        ctx.effects.shake(0.08, 3);
        ctx.playSfx("ding");
      }

      for (const brick of bricks) {
        if (!brick.alive) continue;
        if (circleIntersectsRect(ball, brick)) {
          brick.alive = false;
          cleared += 1;
          ball.vy *= -1;
          ctx.effects.flash(palette.colors.accent, 0.06);
          ctx.effects.spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, palette.colors.accent, 20);
          ctx.playSfx("ding");
          break;
        }
      }

      if (ball.y > ctx.height + 40) {
        misses += 1;
        ctx.effects.shake(0.15, 5);
        ctx.playSfx("hit");
        resetBall();
        if (misses >= spec.params.maxMisses) {
          ctx.playSfx("lose");
          ctx.setResult("lose");
        }
      }

      if (cleared >= spec.params.bricksToClear) {
        ctx.playSfx("win");
        ctx.setResult("win");
      } else if (ctx.getTimeRemaining() <= 0) {
        ctx.playSfx("lose");
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      for (const brick of bricks) {
        if (!brick.alive) continue;
        renderCtx.fillStyle = palette.colors.accent;
        renderCtx.fillRect(brick.x, brick.y, brick.width, brick.height);
        renderCtx.strokeStyle = "rgba(0,0,0,0.2)";
        renderCtx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      }

      renderCtx.fillStyle = palette.colors.text;
      renderCtx.fillRect(paddleX - spec.params.paddleWidth / 2, paddle.y, spec.params.paddleWidth, paddle.height);

      renderCtx.beginPath();
      renderCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      renderCtx.fillStyle = palette.colors.accentSoft;
      renderCtx.fill();

      drawText(
        renderCtx,
        `Bricks ${cleared}/${spec.params.bricksToClear} • Misses ${misses}/${spec.params.maxMisses}`,
        ctx.width / 2,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Break ${spec.params.bricksToClear} bricks before time runs out.`;
    },
    getStatusText() {
      return `Bricks ${cleared}/${spec.params.bricksToClear} • Misses ${misses}/${spec.params.maxMisses}`;
    },
    serializeState() {
      return { cleared, misses, paddleX, ball, bricks };
    },
    getScore() {
      return cleared;
    },
    hydrateState(state) {
      const next = state as {
        cleared?: number;
        misses?: number;
        paddleX?: number;
        ball?: Ball;
        bricks?: Brick[];
      } | null;
      if (!next) return;
      if (typeof next.cleared === "number") cleared = next.cleared;
      if (typeof next.misses === "number") misses = next.misses;
      if (typeof next.paddleX === "number") paddleX = next.paddleX;
      if (next.ball) {
        ball.x = next.ball.x ?? ball.x;
        ball.y = next.ball.y ?? ball.y;
        ball.vx = next.ball.vx ?? ball.vx;
        ball.vy = next.ball.vy ?? ball.vy;
        ball.r = next.ball.r ?? ball.r;
      }
      if (Array.isArray(next.bricks)) {
        bricks.length = 0;
        next.bricks.forEach((brick) => {
          if (brick && typeof brick.x === "number" && typeof brick.y === "number") {
            bricks.push({ ...brick });
          }
        });
      }
    }
  };
};
