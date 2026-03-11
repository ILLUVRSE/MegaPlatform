import type { ModifierDefinition } from "@/lib/minigame/modifiers";

type ModifierPickerProps = {
  modifiers: ModifierDefinition[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
};

export default function ModifierPicker({ modifiers, selected, max, onToggle }: ModifierPickerProps) {
  const limitReached = selected.length >= max;
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Modifiers</p>
        <h2 className="font-display text-2xl font-semibold">Safe Chaos</h2>
        <p className="text-sm text-illuvrse-muted">Pick up to {max} modifiers.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {modifiers.map((modifier) => {
          const active = selected.includes(modifier.id);
          const disabled = !active && limitReached;
          return (
            <button
              key={modifier.id}
              type="button"
              onClick={() => onToggle(modifier.id)}
              disabled={disabled}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                active
                  ? "border-illuvrse-primary bg-illuvrse-primary text-black"
                  : "border-white/20 bg-black/40 text-white/80 hover:border-white/60"
              } ${disabled ? "opacity-40" : ""}`}
              title={modifier.description}
            >
              {modifier.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
