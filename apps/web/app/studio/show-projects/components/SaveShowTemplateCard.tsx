"use client";

import { type FormEvent, useState } from "react";

type Props = {
  project: {
    slug: string;
    title: string;
    description: string | null;
    format: "SERIES" | "MOVIE";
  };
  canSave: boolean;
};

export default function SaveShowTemplateCard({ project, canSave }: Props) {
  const [title, setTitle] = useState(`${project.title} Template`);
  const [description, setDescription] = useState(project.description ?? "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE" | "UNLISTED">("PRIVATE");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResultMessage(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/studio/show-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: project.slug,
          title,
          description: description || null,
          visibility
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        template?: { title: string };
      };

      if (!response.ok || !payload.template) {
        setError(payload.error ?? "Unable to save show template.");
        return;
      }

      setResultMessage(`Saved ${payload.template?.title ?? title} to the internal template library.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="party-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Show Template</p>
          <h2 className="text-xl font-semibold">Save this show as a reusable template</h2>
          <p className="text-sm text-illuvrse-muted">
            Capture the current show structure, episode shells, and extras as an internal Studio template.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
          {project.format}
        </span>
      </div>

      {!canSave ? (
        <p className="text-sm text-illuvrse-muted">You need project edit access to save this show as a template.</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Template title</span>
            <input
              required
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as typeof visibility)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="PUBLIC">Studio Visible</option>
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.24em] text-white/70">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
            >
              {isSaving ? "Saving" : "Save as Template"}
            </button>
            {resultMessage ? <p className="text-sm text-emerald-300">{resultMessage}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </form>
      )}
    </section>
  );
}
