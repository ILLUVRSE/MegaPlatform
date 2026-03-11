/**
 * Short preview panel.
 * Request/response: shows current script/scenes and render asset.
 * Guard: client component.
 */
"use client";

import type { StudioAsset } from "@/lib/studioApi";

type ShortPreviewProps = {
  script?: string | null;
  scenes?: { text: string; durationMs: number }[] | null;
  asset?: StudioAsset | null;
};

export default function ShortPreview({ script, scenes, asset }: ShortPreviewProps) {
  return (
    <div className="party-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Preview</p>
        <h3 className="text-xl font-semibold">Output Preview</h3>
      </div>
      <div className="space-y-3 text-sm text-illuvrse-muted">
        <div>
          <p className="font-semibold text-illuvrse-text">Script</p>
          <p>{script ?? "No script yet."}</p>
        </div>
        <div>
          <p className="font-semibold text-illuvrse-text">Scenes</p>
          {scenes && scenes.length > 0 ? (
            <ul className="space-y-2">
              {scenes.map((scene, index) => (
                <li key={`${scene.text}-${index}`}>
                  • {scene.text} <span className="text-xs text-illuvrse-muted">({scene.durationMs}ms)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No scenes yet.</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-illuvrse-text">Render</p>
          {asset ? (
            <video className="mt-2 w-full rounded-2xl" src={asset.url} controls />
          ) : (
            <p>No render asset yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
