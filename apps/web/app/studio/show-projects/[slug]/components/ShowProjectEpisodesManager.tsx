"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ProjectRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: "SERIES" | "MOVIE";
  status: "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type EpisodeRecord = {
  id: string;
  showProjectId: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  slug: string;
  synopsis: string | null;
  runtimeSeconds: number | null;
  status: "DRAFT" | "READY" | "PUBLISHED";
  templateType: "STANDARD_EPISODE" | "COLD_OPEN_EPISODE" | "MOVIE_CHAPTER";
  createdAt: string;
  updatedAt: string;
};

type Props = {
  project: ProjectRecord;
  initialEpisodes: EpisodeRecord[];
};

const templateOptions: Array<{
  value: EpisodeRecord["templateType"];
  label: string;
  description: string;
}> = [
  {
    value: "STANDARD_EPISODE",
    label: "Standard Episode",
    description: "Classic episodic structure with an opening hook, story beats, and a closing turn."
  },
  {
    value: "COLD_OPEN_EPISODE",
    label: "Cold Open Episode",
    description: "Built for a hard hook before the main story settles into the act structure."
  },
  {
    value: "MOVIE_CHAPTER",
    label: "Movie Chapter",
    description: "Chapter-based pacing for feature or long-form narrative segments."
  }
];

const statusLabel: Record<EpisodeRecord["status"], string> = {
  DRAFT: "Draft",
  READY: "Ready",
  PUBLISHED: "Published"
};

function formatTemplate(templateType: EpisodeRecord["templateType"]) {
  return templateOptions.find((option) => option.value === templateType)?.label ?? templateType;
}

function formatRuntime(runtimeSeconds: number | null) {
  if (!runtimeSeconds) {
    return "Runtime TBD";
  }
  const minutes = Math.floor(runtimeSeconds / 60);
  const seconds = runtimeSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatEpisodeCode(episode: EpisodeRecord, format: ProjectRecord["format"]) {
  if (format === "MOVIE" || episode.templateType === "MOVIE_CHAPTER") {
    return episode.episodeNumber ? `Chapter ${episode.episodeNumber}` : "Chapter draft";
  }
  if (episode.seasonNumber && episode.episodeNumber) {
    return `S${episode.seasonNumber}E${episode.episodeNumber}`;
  }
  if (episode.episodeNumber) {
    return `Episode ${episode.episodeNumber}`;
  }
  return "Unnumbered";
}

export default function ShowProjectEpisodesManager({ project, initialEpisodes }: Props) {
  const router = useRouter();
  const availableTemplateOptions = templateOptions.filter((option) =>
    project.format === "MOVIE" ? option.value === "MOVIE_CHAPTER" : option.value !== "MOVIE_CHAPTER"
  );
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [templateType, setTemplateType] = useState<EpisodeRecord["templateType"]>(
    project.format === "MOVIE" ? "MOVIE_CHAPTER" : "STANDARD_EPISODE"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreateEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/studio/show-projects/${project.slug}/episodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateType })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to create episode.");
      return;
    }

    setIsComposerOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
              {project.format} Project
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {project.description || "No description yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
          >
            Create Episode
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{project.status}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Episodes</p>
            <p className="mt-2 text-lg font-semibold text-white">{initialEpisodes.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Slug</p>
            <p className="mt-2 text-lg font-semibold text-white">{project.slug}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Owner</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {project.ownerName || project.ownerEmail || project.ownerId}
            </p>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Updated</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {new Date(project.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {isComposerOpen ? (
          <form onSubmit={handleCreateEpisode} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-illuvrse-muted">New Episode</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Choose a template preset</h2>
              </div>
              <p className="max-w-xl text-sm text-illuvrse-muted">
                New items start in draft with a placeholder title and lightweight structure notes.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {availableTemplateOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-[24px] border p-4 transition ${
                      templateType === option.value
                        ? "border-cyan-300/60 bg-cyan-400/10"
                        : "border-white/10 bg-slate-950/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="templateType"
                      value={option.value}
                      checked={templateType === option.value}
                      onChange={() => setTemplateType(option.value)}
                      className="sr-only"
                    />
                    <p className="text-sm font-semibold text-white">{option.label}</p>
                    <p className="mt-2 text-sm text-white/70">{option.description}</p>
                  </label>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
              >
                {isPending ? "Creating" : "Create Episode"}
              </button>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="interactive-focus rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white"
              >
                Cancel
              </button>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Episode Library</p>
            <h2 className="text-xl font-semibold">Project episodes</h2>
          </div>
          <p className="text-sm text-illuvrse-muted">
            {project.format === "MOVIE" ? "Chapters and sequence drafts" : "Episodes ready for story development"}
          </p>
        </div>

        {initialEpisodes.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No episodes yet. Create the first one to seed structure notes and start the release pipeline draft.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {initialEpisodes.map((episode) => (
              <article
                key={episode.id}
                className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                      {formatEpisodeCode(episode, project.format)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{episode.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                    {statusLabel[episode.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-white/50">
                  <span>{formatTemplate(episode.templateType)}</span>
                  <span>{formatRuntime(episode.runtimeSeconds)}</span>
                  <span>{episode.slug}</span>
                </div>

                <p className="mt-4 text-sm text-white/70">
                  {episode.synopsis || "No structure notes yet."}
                </p>

                <div className="mt-4">
                  <Link
                    href={`/studio/show-projects/${project.slug}/episodes/${episode.slug}`}
                    className="interactive-focus inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white"
                  >
                    Open Script Editor
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
