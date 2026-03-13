"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ShowTemplateSummary = {
  id: string;
  title: string;
  description: string | null;
  templateType: "SERIES" | "MOVIE";
  createdById: string;
  createdByName: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  episodeCount: number;
  extraCount: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialTemplates: ShowTemplateSummary[];
  currentUserId: string;
};

const visibilityLabel: Record<ShowTemplateSummary["visibility"], string> = {
  PUBLIC: "Studio",
  PRIVATE: "Private",
  UNLISTED: "Unlisted"
};

export default function ShowTemplateLibrary({ initialTemplates, currentUserId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "SERIES" | "MOVIE" | "MINE">("ALL");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>(
    Object.fromEntries(initialTemplates.map((template) => [template.id, `${template.title} Draft`]))
  );
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});

  const visibleTemplates = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return initialTemplates.filter((template) => {
      if (filter === "SERIES" && template.templateType !== "SERIES") return false;
      if (filter === "MOVIE" && template.templateType !== "MOVIE") return false;
      if (filter === "MINE" && template.createdById !== currentUserId) return false;
      if (!lowered) return true;
      return (
        template.title.toLowerCase().includes(lowered) ||
        (template.description ?? "").toLowerCase().includes(lowered) ||
        (template.createdByName ?? "").toLowerCase().includes(lowered)
      );
    });
  }, [currentUserId, filter, initialTemplates, query]);

  async function handleCreateFromTemplate(templateId: string) {
    setActiveTemplateId(templateId);
    setErrorById((current) => ({ ...current, [templateId]: null }));
    try {
      const response = await fetch(`/api/studio/show-templates/${templateId}/create-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitles[templateId]?.trim() || undefined
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        project?: { slug: string };
      };

      if (!response.ok || !payload.project) {
        setErrorById((current) => ({ ...current, [templateId]: payload.error ?? "Unable to create show project." }));
        setActiveTemplateId(null);
        return;
      }

      router.refresh();
      router.push(`/studio/show-projects/${payload.project.slug}`);
    } catch {
      setErrorById((current) => ({ ...current, [templateId]: "Unable to create show project." }));
      setActiveTemplateId(null);
    }
  }

  return (
    <section id="templates" className="party-card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Template Library</p>
          <h2 className="text-xl font-semibold">Browse reusable show templates</h2>
          <p className="text-sm text-illuvrse-muted">
            Internal-only scaffold for reusing show, episode, and extra defaults across Studio.
          </p>
        </div>
        <p className="text-sm text-illuvrse-muted">{initialTemplates.length} saved templates</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, descriptions, or creators"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {[
            ["ALL", "All"],
            ["SERIES", "Series"],
            ["MOVIE", "Movies"],
            ["MINE", "Mine"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
              className={`interactive-focus rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] ${
                filter === value ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/5 text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visibleTemplates.length === 0 ? (
        <p className="text-sm text-illuvrse-muted">No templates match the current filters yet.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleTemplates.map((template) => (
            <article
              key={template.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">{template.templateType}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{template.title}</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                  {visibilityLabel[template.visibility]}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-white/70">
                {template.description || "No template description yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                <span>{template.episodeCount} episode defaults</span>
                <span>{template.extraCount} extras</span>
                <span>{template.createdByName || "Unknown creator"}</span>
              </div>
              <label className="mt-4 block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-white/70">New project title</span>
                <input
                  value={draftTitles[template.id] ?? ""}
                  onChange={(event) =>
                    setDraftTitles((current) => ({
                      ...current,
                      [template.id]: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-white/45">Updated {new Date(template.updatedAt).toLocaleDateString()}</p>
                <button
                  type="button"
                  disabled={activeTemplateId === template.id}
                  onClick={() => void handleCreateFromTemplate(template.id)}
                  className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
                >
                  {activeTemplateId === template.id ? "Creating" : "Create Show"}
                </button>
              </div>
              {errorById[template.id] ? <p className="mt-3 text-sm text-rose-300">{errorById[template.id]}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
