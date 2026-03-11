import type { MinigameController, RuntimeContext, InputSnapshot } from "../runtime/types";
import type { MinigameSpec, MinigameTheme } from "../spec";
import { drawMeter, drawText } from "./shared";
import { getPaletteById } from "../theme";
import { SeededRng } from "../rng";

export const buildSpec = (seed: string, difficulty: number, theme: MinigameTheme): MinigameSpec => {
  const rng = new SeededRng(`${seed}:BUTTON_MASH_RACE`);
  const mashPerPress = rng.nextFloat(0.7, 1.2) + difficulty * 0.08;
  const decayPerSecond = rng.nextFloat(0, 2.4) + difficulty * 0.4;

  return {
    id: `BUTTON_MASH_RACE-${seed}`,
    seed,
    templateId: "BUTTON_MASH_RACE",
    title: "Button Mash Panic",
    tagline: "Smash to survive.",
    instructions: "Mash Space or alternate A/D to fill the meter before time runs out.",
    durationSeconds: 30,
    inputSchema: {
      keys: ["Space", "KeyA", "KeyD"],
      mouse: { enabled: false }
    },
    winCondition: { type: "meter", target: 100 },
    loseCondition: { type: "timer" },
    scoring: { mode: "winlose" },
    theme,
    params: {
      meterTarget: 100,
      mashPerPress,
      decayPerSecond
    },
    modifiers: []
  };
};

export const createController = (spec: MinigameSpec): MinigameController => {
  let ctx: RuntimeContext;
  let meter = 0;
  let lastKey: string | null = null;

  const palette = getPaletteById(spec.theme.palette);

  return {
    init(runtime) {
      ctx = runtime;
    },
    applyInput(input: InputSnapshot) {
      const pressed = input.keysPressed;
      const validKeys = ["Space", "KeyA", "KeyD"];
      for (const key of validKeys) {
        if (pressed[key]) {
          let bonus = 1;
          if (key !== "Space" && lastKey && lastKey !== key) {
            bonus = 1.15;
          }
          meter += spec.params.mashPerPress * bonus;
          lastKey = key;
          ctx.effects.flash("#ffffff", 0.05);
          ctx.playSfx("ding");
        }
      }
    },
    step(dt: number) {
      meter = Math.max(0, meter - spec.params.decayPerSecond * dt);
      if (meter >= spec.params.meterTarget) {
        if (!ctx.isGameOver()) {
          ctx.effects.shake(0.2, 8);
          ctx.playSfx("win");
        }
        ctx.setResult("win");
        ctx.setStatus("Meter MAXED!");
      } else if (ctx.getTimeRemaining() <= 0) {
        if (!ctx.isGameOver()) {
          ctx.playSfx("lose");
        }
        ctx.setResult("lose");
      }
    },
    render(renderCtx: CanvasRenderingContext2D) {
      const meterWidth = 680;
      const meterHeight = 30;
      const x = (ctx.width - meterWidth) / 2;
      const y = ctx.height / 2 - meterHeight / 2;
      drawText(renderCtx, "MASH!", ctx.width / 2, y - 60, 32, palette.colors.accent);
      drawMeter(
        renderCtx,
        x,
        y,
        meterWidth,
        meterHeight,
        meter,
        spec.params.meterTarget,
        palette.colors.accent,
        "rgba(255,255,255,0.15)"
      );
      drawText(
        renderCtx,
        `${Math.floor((meter / spec.params.meterTarget) * 100)}%`,
        ctx.width / 2,
        y + 50,
        20,
        palette.colors.text
      );
    },
    getObjectiveText() {
      return "Fill the meter to 100 before time runs out.";
    },
    getStatusText() {
      return `Meter ${Math.floor((meter / spec.params.meterTarget) * 100)}%`;
    },
    serializeState() {
      return { meter, lastKey };
    },
    getScore() {
      return meter;
    },
    hydrateState(state) {
      const next = state as { meter?: number; lastKey?: string | null } | null;
      if (!next) return;
      if (typeof next.meter === "number") {
        meter = next.meter;
      }
      if (typeof next.lastKey === "string" || next.lastKey === null) {
        lastKey = next.lastKey ?? null;
      }
    }
  };
};
