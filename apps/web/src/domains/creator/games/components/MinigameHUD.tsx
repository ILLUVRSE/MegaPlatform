"use client";

import type { MinigameSpec } from "@/lib/minigame/spec";

export type HudProps = {
  spec: MinigameSpec;
  timeRemaining: number;
  objective: string;
  status: string;
  result: "win" | "lose" | null;
};

export default function MinigameHUD({ spec, timeRemaining, objective, status, result }: HudProps) {
  return (
    <div className="party-card flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{spec.tagline}</p>
        <h2 className="text-2xl font-semibold">{spec.title}</h2>
        <p className="text-sm text-illuvrse-muted">{objective}</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="rounded-full bg-illuvrse-border px-4 py-2">⏱ {timeRemaining.toFixed(1)}s</div>
        <div className="rounded-full bg-illuvrse-border px-4 py-2">{status || "Good luck!"}</div>
        {result ? (
          <div
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              result === "win" ? "bg-emerald-400/80 text-emerald-950" : "bg-rose-400/80 text-rose-950"
            }`}
          >
            {result === "win" ? "WIN" : "LOSE"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
