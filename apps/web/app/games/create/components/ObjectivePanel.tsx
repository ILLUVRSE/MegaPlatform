import type { ObjectiveOption } from "@/lib/minigame/gamegrid";

type ObjectivePanelProps = {
  winOptions: ObjectiveOption[];
  loseOptions: ObjectiveOption[];
  selectedWinId?: string;
  selectedLoseId?: string;
  onSelectWin: (id: string) => void;
  onSelectLose: (id: string) => void;
};

export default function ObjectivePanel({
  winOptions,
  loseOptions,
  selectedWinId,
  selectedLoseId,
  onSelectWin,
  onSelectLose
}: ObjectivePanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Objectives</p>
        <h2 className="font-display text-2xl font-semibold">Win / Lose</h2>
        <p className="text-sm text-illuvrse-muted">Define exactly what success looks like.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">Win Condition</p>
          <div className="flex flex-wrap gap-2">
            {winOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectWin(option.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                  option.id === selectedWinId
                    ? "border-illuvrse-primary bg-illuvrse-primary text-black"
                    : "border-white/20 bg-black/40 text-white/80 hover:border-white/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-illuvrse-muted">{winOptions.find((option) => option.id === selectedWinId)?.description}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">Lose Condition</p>
          <div className="flex flex-wrap gap-2">
            {loseOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectLose(option.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                  option.id === selectedLoseId
                    ? "border-illuvrse-accent bg-illuvrse-accent text-black"
                    : "border-white/20 bg-black/40 text-white/80 hover:border-white/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-illuvrse-muted">{loseOptions.find((option) => option.id === selectedLoseId)?.description}</p>
        </div>
      </div>
    </section>
  );
}
