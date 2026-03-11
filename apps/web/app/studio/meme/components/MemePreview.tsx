/**
 * Meme preview component.
 * Request/response: renders uploaded image and rendered meme.
 * Guard: client component.
 */
"use client";

export default function MemePreview({
  sourceUrl,
  renderUrl,
  caption
}: {
  sourceUrl: string | null;
  renderUrl: string | null;
  caption: string | null;
}) {
  return (
    <div className="party-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Preview</p>
        <h3 className="text-xl font-semibold">Meme Output</h3>
      </div>
      <div className="space-y-3 text-sm text-illuvrse-muted">
        <div>
          <p className="font-semibold text-illuvrse-text">Source Image</p>
          {sourceUrl ? (
            <img className="mt-2 w-full rounded-2xl" src={sourceUrl} alt="Source" />
          ) : (
            <p>No upload yet.</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-illuvrse-text">Caption</p>
          <p>{caption ?? "No caption selected."}</p>
        </div>
        <div>
          <p className="font-semibold text-illuvrse-text">Rendered Meme</p>
          {renderUrl ? (
            <img className="mt-2 w-full rounded-2xl" src={renderUrl} alt="Rendered meme" />
          ) : (
            <p>No render yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
