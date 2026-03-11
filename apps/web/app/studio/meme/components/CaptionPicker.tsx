/**
 * Caption picker component.
 * Request/response: renders caption list for selection.
 * Guard: client component.
 */
"use client";

export default function CaptionPicker({
  captions,
  selected,
  onSelect
}: {
  captions: string[];
  selected: string | null;
  onSelect: (caption: string) => void;
}) {
  if (captions.length === 0) {
    return <div className="party-card">No captions yet.</div>;
  }

  return (
    <div className="party-card space-y-3">
      <h3 className="text-lg font-semibold">Captions</h3>
      <div className="grid gap-2">
        {captions.map((caption) => (
          <button
            key={caption}
            type="button"
            className={`rounded-2xl border px-3 py-2 text-left text-sm ${
              selected === caption
                ? "border-illuvrse-primary bg-illuvrse-primary bg-opacity-10"
                : "border-illuvrse-border"
            }`}
            onClick={() => onSelect(caption)}
          >
            {caption}
          </button>
        ))}
      </div>
    </div>
  );
}
