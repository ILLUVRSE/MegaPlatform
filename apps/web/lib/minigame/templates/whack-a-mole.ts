import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { drawText, drawCircle } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

const HOLES = [
  { x: 240, y: 180 },
  { x: 540, y: 180 },
  { x: 840, y: 180 },
  { x: 240, y: 360 },
  { x: 540, y: 360 },
  { x: 840, y: 360 }
];

type Mole = {
  x: number;
  y: number;
  r: number;
  life: number;
  active: boolean;
};

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:WHACK_A_MOLE_CLICKER`);
  return {
    id: `WHACK_A_MOLE_CLICKER-${seed}`,
    seed,
    templateId: "WHACK_A_MOLE_CLICKER",
    title: "Mole Mayhem",
    tagline: "Whack fast, whack fair.",
    instructions: "Click the popping targets. Build combos for extra juice.",
    durationSeconds: 30,
    inputSchema: {
      keys: [],
      mouse: { enabled: true }
    },
    winCondition: { type: "hits", target: 22 },
    loseCondition: { type: "timer" },
    scoring: { mode: "winlose" },
    theme,
    params: {
      targetCount: Math.round(rng.nextFloat(20, 26) + difficulty * 2),
      targetSize: rng.nextFloat(54, 74) - difficulty * 4,
      spawnInterval: rng.nextFloat(0.4, 0.7) - difficulty * 0.05,
      comboWindow: rng.nextFloat(0.6, 1.1) - difficulty * 0.05
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let hits = 0;
  let combo = 0;
  let comboTimer = 0;
  let spawnTimer = 0;
  const mole: Mole = { x: 0, y: 0, r: spec.params.targetSize, life: 0, active: false };

  const palette = getPaletteById(spec.theme.palette);

  const spawnMole = () => {
    const hole = ctx.rng.pick(HOLES);
    mole.x = hole.x;
    mole.y = hole.y;
    mole.r = spec.params.targetSize;
    mole.life = 1;
    mole.active = true;
  };

  return {
    init(runtime) {
      ctx = runtime;
      spawnMole();
    },
    applyInput(input: InputSnapshot) {
      if (!input.mouse.clicked) return;
      const dx = input.mouse.x - mole.x;
      const dy = input.mouse.y - mole.y;
      const dist = Math.hypot(dx, dy);
      if (mole.active && dist <= mole.r) {
        hits += 1;
        combo += 1;
        comboTimer = spec.params.comboWindow;
        ctx.effects.flash(palette.colors.accent, 0.08);
        ctx.effects.spawnParticles(mole.x, mole.y, palette.colors.accent, 20);
        ctx.playSfx("ding");
        mole.active = false;
      } else {
        combo = 0;
        ctx.effects.shake(0.08, 3);
        ctx.playSfx("hit");
      }
    },
    step(dt: number) {
      spawnTimer -= dt;
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 0;
      }

      const lateBoost = ctx.getTimeRemaining() <= 10 ? 0.75 : 1;
      if (spawnTimer <= 0 && !mole.active) {
        spawnMole();
        spawnTimer = spec.params.spawnInterval * lateBoost;
      }

      if (mole.active) {
        mole.life -= dt * 0.8;
        if (mole.life <= 0) {
          mole.active = false;
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
      for (const hole of HOLES) {
        drawCircle(renderCtx, hole.x, hole.y + 40, 46, "rgba(0,0,0,0.3)");
      }

      if (mole.active) {
        drawCircle(renderCtx, mole.x, mole.y, mole.r, palette.colors.accentSoft, palette.colors.text);
        drawText(renderCtx, "WHACK", mole.x, mole.y, 14, palette.colors.text);
      }

      drawText(
        renderCtx,
        `Hits ${hits}/${spec.params.targetCount} • Combo x${combo}`,
        ctx.width / 2,
        40,
        16,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return `Whack ${spec.params.targetCount} targets in 30 seconds.`;
    },
    getStatusText() {
      return `Hits ${hits}/${spec.params.targetCount} • Combo x${combo}`;
    },
    serializeState() {
      return { hits, combo, mole };
    },
    getScore() {
      return hits;
    },
    hydrateState(state) {
      const next = state as { hits?: number; combo?: number; mole?: Mole } | null;
      if (!next) return;
      if (typeof next.hits === "number") hits = next.hits;
      if (typeof next.combo === "number") combo = next.combo;
      if (next.mole) {
        mole.x = next.mole.x ?? mole.x;
        mole.y = next.mole.y ?? mole.y;
        mole.r = next.mole.r ?? mole.r;
        mole.life = next.mole.life ?? mole.life;
        mole.active = next.mole.active ?? mole.active;
      }
    }
  };
};
