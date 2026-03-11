import type { AutoFixChange } from "@/lib/minigame/autofix";
import type { MinigameSpec } from "@/lib/minigame/spec";

type SavePublishBarProps = {
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "NEW";
  spec: MinigameSpec | null;
  warnings: string[];
  changes?: AutoFixChange[];
  shareUrl?: string | null;
  saveStatus?: string;
  isSaving?: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onCopyLink: () => void;
};

export default function SavePublishBar({
  title,
  description,
  status,
  spec,
  warnings,
  changes,
  shareUrl,
  saveStatus,
  isSaving,
  onTitleChange,
  onDescriptionChange,
  onSave,
  onPublish,
  onCopyLink
}: SavePublishBarProps) {
  const formatValue = (value: unknown) => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Save + Publish</p>
        <h2 className="font-display text-2xl font-semibold">Ship Your Game</h2>
        <p className="text-sm text-illuvrse-muted">Drafts stay private until you publish.</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-white/20 bg-black/50 p-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Title</label>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          placeholder="Give it a bold name"
          aria-label="Game title"
        />
        <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Description</label>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          placeholder="Short pitch for the community grid"
          aria-label="Game description"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            Status: {status}
          </span>
          {saveStatus ? <span className="text-xs text-illuvrse-primary">{saveStatus}</span> : null}
        </div>
        {warnings.length ? (
          <div className="rounded-xl border border-amber-300/40 bg-amber-200/10 p-3 text-xs text-amber-100">
            <p className="font-semibold uppercase tracking-[0.3em]">Auto-fix applied</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {changes && changes.length ? (
          <div className="rounded-xl border border-sky-200/30 bg-sky-200/10 p-3 text-xs text-sky-100">
            <p className="font-semibold uppercase tracking-[0.3em]">Auto-fix details</p>
            <div className="mt-2 space-y-1">
              {changes.map((change, index) => (
                <div key={`${change.path}-${index}`}>
                  <span className="font-semibold">{change.path}</span>:{" "}
                  <span className="text-white/70">
                    {formatValue(change.before)} → {formatValue(change.after)}
                  </span>{" "}
                  <span className="text-white/50">({change.reason})</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="party-button"
            onClick={onSave}
            disabled={!spec || isSaving}
            data-testid="save-draft"
          >
            Save Draft
          </button>
          <button
            type="button"
            className="party-button"
            onClick={onPublish}
            disabled={!spec || isSaving}
            data-testid="publish-game"
          >
            Publish
          </button>
          <button
            type="button"
            className="party-button"
            onClick={onCopyLink}
            disabled={!shareUrl}
            data-testid="copy-share"
          >
            Copy Share Link
          </button>
        </div>
        {shareUrl ? (
          <p className="text-xs text-illuvrse-muted" data-testid="share-url">
            Share: {shareUrl}
          </p>
        ) : null}
      </div>
    </section>
  );
}
