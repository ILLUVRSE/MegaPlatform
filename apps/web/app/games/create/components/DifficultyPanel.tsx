import type { DifficultyPreset, DifficultyScore, TemplatePresetPack } from "@/lib/minigame/gamegrid";

type DifficultyPanelProps = {
  difficulty: DifficultyPreset;
  ramp: number;
  onDifficultyChange: (value: DifficultyPreset) => void;
  onRampChange: (value: number) => void;
  presetPacks?: TemplatePresetPack[];
  onPresetSelect?: (preset: TemplatePresetPack) => void;
  showAdvanced?: boolean;
  difficultyScore?: DifficultyScore | null;
};

export default function DifficultyPanel({
  difficulty,
  ramp,
  onDifficultyChange,
  onRampChange,
  presetPacks,
  onPresetSelect,
  showAdvanced = true,
  difficultyScore
}: DifficultyPanelProps) {
  const options: DifficultyPreset[] = ["easy", "normal", "hard"];
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Difficulty</p>
        <h2 className="font-display text-2xl font-semibold">Pace & Intensity</h2>
        <p className="text-sm text-illuvrse-muted">Set the baseline then add adrenaline.</p>
      </div>
      {difficultyScore ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>Balance Meter</span>
            <span>
              {difficultyScore.label} {difficultyScore.score}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-illuvrse-primary"
              style={{ width: `${difficultyScore.score}%` }}
            />
          </div>
        </div>
      ) : null}
      {showAdvanced && presetPacks && presetPacks.length ? (
        <div className="flex flex-wrap gap-2">
          {presetPacks.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetSelect?.(preset)}
              title={preset.description}
              className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 hover:border-white/50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onDifficultyChange(option)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
              option === difficulty
                ? "border-illuvrse-primary bg-illuvrse-primary text-black"
                : "border-white/20 text-white/80 hover:border-white/60"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {showAdvanced ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>Chill</span>
            <span>Intense</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ramp}
            onChange={(event) => onRampChange(Number(event.target.value))}
            className="w-full accent-illuvrse-primary"
            aria-label="Pacing intensity"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/60">
          Advanced pacing unlocks after your first publish.
        </div>
      )}
    </section>
  );
}
