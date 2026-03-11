import type { GamegridTemplate } from "@/lib/minigame/gamegrid";

type TemplatePickerProps = {
  templates: GamegridTemplate[];
  selectedId: string;
  onSelect: (id: GamegridTemplate["id"]) => void;
};

export default function TemplatePicker({ templates, selectedId, onSelect }: TemplatePickerProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Template</p>
        <h2 className="font-display text-2xl font-semibold">Pick a Base</h2>
        <p className="text-sm text-illuvrse-muted">Choose the core minigame shape.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => {
          const selected = template.id === selectedId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={`group rounded-2xl border px-4 py-3 text-left transition-all ${
                selected
                  ? "border-illuvrse-primary bg-white/90 text-illuvrse-text shadow-card"
                  : "border-white/20 bg-black/50 text-white hover:border-white/50"
              }`}
            >
              <p className={`text-xs uppercase tracking-[0.3em] ${selected ? "text-illuvrse-primary" : "text-white/60"}`}>
                {template.vibe}
              </p>
              <h3 className={`mt-2 text-lg font-semibold ${selected ? "text-illuvrse-text" : "text-white"}`}>
                {template.name}
              </h3>
              <p className={`mt-1 text-sm ${selected ? "text-illuvrse-muted" : "text-white/70"}`}>
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
