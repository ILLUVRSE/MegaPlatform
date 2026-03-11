/**
 * Template picker component.
 * Request/response: selects meme layout template.
 * Guard: client component.
 */
"use client";

const TEMPLATES = ["Top/Bottom", "Impact", "Tweet", "TikTok Caption"];

export default function TemplatePicker({
  selected,
  onSelect
}: {
  selected: string;
  onSelect: (template: string) => void;
}) {
  return (
    <div className="party-card space-y-3">
      <h3 className="text-lg font-semibold">Template</h3>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              selected === template
                ? "border-illuvrse-primary bg-illuvrse-primary text-white"
                : "border-illuvrse-border"
            }`}
            onClick={() => onSelect(template)}
          >
            {template}
          </button>
        ))}
      </div>
    </div>
  );
}
