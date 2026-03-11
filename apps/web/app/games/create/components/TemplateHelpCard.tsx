import type { TemplateHelp } from "@/lib/minigame/gamegrid";

type TemplateHelpCardProps = {
  help: TemplateHelp;
};

export default function TemplateHelpCard({ help }: TemplateHelpCardProps) {
  return (
    <section className="rounded-2xl border border-white/20 bg-black/40 p-4 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">Template Guide</p>
      <h3 className="mt-2 font-display text-xl font-semibold">{help.headline}</h3>
      <p className="mt-2 text-sm text-white/70">{help.summary}</p>
      <div className="mt-4 space-y-2 text-xs text-white/70">
        <p className="font-semibold uppercase tracking-[0.3em] text-white/60">Controls</p>
        <div className="flex flex-wrap gap-2">
          {help.controls.map((control) => (
            <span key={control} className="rounded-full border border-white/10 px-3 py-1">
              {control}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2 text-xs text-white/70">
        <p className="font-semibold uppercase tracking-[0.3em] text-white/60">Tips</p>
        <div className="space-y-1">
          {help.tips.map((tip) => (
            <div key={tip}>• {tip}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
