import { useEffect, useRef } from "react";
import type { MinigameSpec } from "@/lib/minigame/spec";
import MinigameFrame from "@/src/domains/creator/games/components/MinigameFrame";

type GamePreviewProps = {
  spec: MinigameSpec | null;
  previewKey: number;
  onPlayTest: () => void;
  onReset: () => void;
  onCaptureThumbnail?: (dataUrl: string) => void;
};

export default function GamePreview({ spec, previewKey, onPlayTest, onReset, onCaptureThumbnail }: GamePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onCaptureThumbnail) return;
    const timer = window.setTimeout(() => {
      const canvas = wrapperRef.current?.querySelector("canvas");
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        if (dataUrl && dataUrl.startsWith("data:image")) {
          onCaptureThumbnail(dataUrl);
        }
      } catch {
        // ignore capture failures
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [previewKey, onCaptureThumbnail]);

  return (
    <section className="space-y-4" ref={wrapperRef}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Live Preview</p>
          <h2 className="font-display text-2xl font-semibold">Play Test</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="party-button" onClick={onPlayTest} data-testid="preview-play">
            Play Test
          </button>
          <button type="button" className="party-button" onClick={onReset} data-testid="preview-reset">
            Reset
          </button>
        </div>
      </div>
      {spec ? (
        <MinigameFrame key={previewKey} spec={spec} showControls={false} />
      ) : (
        <div className="rounded-2xl border border-white/20 bg-black/50 p-6 text-sm text-white/70">
          Pick a template to start previewing.
        </div>
      )}
    </section>
  );
}
