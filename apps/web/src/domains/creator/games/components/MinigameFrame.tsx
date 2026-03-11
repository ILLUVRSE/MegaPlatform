"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MinigameSpec } from "@/lib/minigame/spec";
import { MinigameRuntime } from "@/lib/minigame/runtime";
import { createControllerForSpec } from "@/lib/minigame/templates";
import { shouldPreventGameplayKey } from "@/lib/minigame/inputLock";
import type { HudState } from "@/lib/minigame/runtime/types";
import MinigameHUD from "@/src/domains/creator/games/components/MinigameHUD";

export type MinigameFrameProps = {
  spec: MinigameSpec;
  onReplay?: () => void;
  onMutate?: () => void;
  onReroll?: () => void;
  onGameOver?: (result: "win" | "lose") => void;
  onContinue?: () => void;
  continueLabel?: string;
  mode?: "solo" | "party";
  showControls?: boolean;
};

const noop = () => {};

export default function MinigameFrame({
  spec,
  onReplay,
  onMutate,
  onReroll,
  onGameOver,
  onContinue,
  continueLabel = "Continue",
  mode = "solo",
  showControls
}: MinigameFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<MinigameRuntime | null>(null);
  const onGameOverRef = useRef<MinigameFrameProps["onGameOver"]>(onGameOver);
  const [hud, setHud] = useState<HudState>({
    timeRemaining: spec.durationSeconds,
    objective: spec.instructions,
    status: "",
    result: null as "win" | "lose" | null
  });
  const [isFocused, setIsFocused] = useState(false);
  const shouldShowControls = showControls ?? mode === "solo";

  const controller = useMemo(() => createControllerForSpec(spec), [spec]);
  const isPlaying = hud.result === null;

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const runtime = new MinigameRuntime({
      canvas: canvasRef.current,
      spec,
      controller,
      onHudUpdate: (next) => setHud(next),
      onGameOver: (result) => {
        setHud((prev) => ({ ...prev }));
        onGameOverRef.current?.(result);
      }
    });
    runtimeRef.current = runtime;
    runtime.start();
    return () => {
      runtime.stop();
      runtimeRef.current = null;
    };
  }, [controller, spec]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.setInputEnabled(isFocused && isPlaying);
    }
  }, [isFocused, isPlaying]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!shouldPreventGameplayKey(event.code, isFocused, isPlaying)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => {
      window.removeEventListener("keydown", handler, { capture: true });
    };
  }, [isFocused, isPlaying]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (event: WheelEvent) => {
      if (!isFocused || !isPlaying) return;
      event.preventDefault();
    };
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", handleWheel);
    };
  }, [isFocused, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPlaying]);

  return (
    <div className="space-y-4">
      <MinigameHUD
        spec={spec}
        timeRemaining={hud.timeRemaining}
        objective={hud.objective}
        status={hud.status}
        result={hud.result}
      />
      {shouldShowControls ? (
        <div className="flex flex-wrap items-center gap-3">
          <button className="party-button" onClick={onMutate ?? noop}>
            Mutate
          </button>
          <button className="party-button" onClick={onReroll ?? noop}>
            Reroll
          </button>
          <button className="party-button" onClick={onReplay ?? noop}>
            Replay
          </button>
        </div>
      ) : null}
      <div
        ref={wrapperRef}
        className="relative rounded-3xl border border-white/20 bg-black/30 p-3 shadow-xl"
        style={{ overscrollBehavior: "contain", touchAction: "none", userSelect: "none", overflow: "hidden" }}
        tabIndex={0}
        onClick={() => {
          wrapperRef.current?.focus();
          setIsFocused(true);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <div className="aspect-[1080/608] w-full overflow-hidden rounded-2xl bg-black">
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>
        {!isFocused && isPlaying ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white">
              Click to focus
            </div>
          </div>
        ) : null}
        {hud.result ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-white shadow-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Game Over</p>
              <h3 className="mt-2 text-3xl font-semibold">
                {hud.result === "win" ? "You Win!" : "You Lose"}
              </h3>
              {hud.result === "win" && spec.modifiers.includes("confettiOnSuccess") ? (
                <p className="mt-2 text-lg">🎉 🎉 🎉</p>
              ) : null}
              {mode === "party" ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button className="party-button" onClick={onContinue ?? noop}>
                    {continueLabel}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button className="party-button" onClick={onReplay ?? noop}>
                    Play Again
                  </button>
                  <button className="party-button" onClick={onMutate ?? noop}>
                    Mutate
                  </button>
                  <button className="party-button" onClick={onReroll ?? noop}>
                    Reroll
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
