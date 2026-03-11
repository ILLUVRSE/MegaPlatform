import type { ThemePalette } from "@/lib/minigame/theme";

type ThemePickerProps = {
  palettes: ThemePalette[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function ThemePicker({ palettes, selectedId, onSelect }: ThemePickerProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Theme</p>
        <h2 className="font-display text-2xl font-semibold">Skin It</h2>
        <p className="text-sm text-illuvrse-muted">Pick a vibe, palette, and particles.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {palettes.map((palette) => {
          const selected = palette.id === selectedId;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onSelect(palette.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                selected ? "border-illuvrse-primary shadow-card" : "border-white/20 bg-black/40"
              }`}
            >
              <div
                className="mb-3 h-12 w-full rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${palette.colors.background}, ${palette.colors.accentSoft})`
                }}
              />
              <p className={`text-sm font-semibold ${selected ? "text-illuvrse-text" : "text-white"}`}>
                {palette.name}
              </p>
              <p className="text-xs text-illuvrse-muted">Particles: {palette.theme.particles}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
