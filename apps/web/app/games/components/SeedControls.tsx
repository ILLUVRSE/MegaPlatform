"use client";

import type { MinigameSpec } from "@/lib/minigame/spec";

export type SeedControlsProps = {
  spec: MinigameSpec;
  onMutate: () => void;
  onReroll: () => void;
  onReplay: () => void;
  onCopySeed: () => void;
};

export default function SeedControls({ spec, onMutate, onReroll, onReplay, onCopySeed }: SeedControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="party-button" onClick={onMutate}>
        Mutate
      </button>
      <button className="party-button" onClick={onReroll}>
        Reroll
      </button>
      <button className="party-button" onClick={onReplay}>
        Replay
      </button>
      <button className="party-button" onClick={onCopySeed}>
        Copy Seed
      </button>
      <span className="rounded-full bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
        Seed {spec.seed}
      </span>
    </div>
  );
}
