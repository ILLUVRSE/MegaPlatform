"use client";

type FeedMode = "wall" | "shorts";

export default function FeedTabs({ mode, onChange }: { mode: FeedMode; onChange: (mode: FeedMode) => void }) {
  return (
    <div className="inline-flex rounded-full border border-illuvrse-border bg-white p-1">
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "wall" ? "bg-illuvrse-primary text-white" : "text-illuvrse-muted"}`}
        onClick={() => onChange("wall")}
      >
        Wall
      </button>
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "shorts" ? "bg-illuvrse-primary text-white" : "text-illuvrse-muted"}`}
        onClick={() => onChange("shorts")}
      >
        Shorts
      </button>
    </div>
  );
}
