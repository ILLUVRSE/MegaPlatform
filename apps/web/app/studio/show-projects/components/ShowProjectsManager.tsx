"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ShowProjectRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: "SERIES" | "MOVIE";
  status: "DRAFT" | "IN_PRODUCTION" | "READY_TO_PUBLISH" | "PUBLISHED";
  currentUserRole: "OWNER" | "EDITOR" | "WRITER" | "PRODUCER" | "VIEWER" | null;
  posterImageUrl: string | null;
  bannerImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialProjects: ShowProjectRecord[];
};

const statusLabel: Record<ShowProjectRecord["status"], string> = {
  DRAFT: "Draft",
  IN_PRODUCTION: "In production",
  READY_TO_PUBLISH: "Ready to publish",
  PUBLISHED: "Published"
};

const roleLabel: Record<NonNullable<ShowProjectRecord["currentUserRole"]>, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  WRITER: "Writer",
  PRODUCER: "Producer",
  VIEWER: "Viewer"
};

export default function ShowProjectsManager({ initialProjects }: Props) {
  const router = useRouter();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<ShowProjectRecord["format"]>("SERIES");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/studio/show-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        format
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: { slug: string };
    };

    if (!response.ok || !payload.project) {
      setError(payload.error ?? "Unable to create show project.");
      return;
    }

    setTitle("");
    setDescription("");
    setFormat("SERIES");
    setIsComposerOpen(false);
    startTransition(() => {
      router.refresh();
      router.push(`/studio/show-projects/${payload.project?.slug}`);
    });
  }

  return (
    <div className="space-y-4">
      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Shows</p>
            <h1 className="text-3xl font-semibold">Show Projects</h1>
            <p className="text-sm text-illuvrse-muted">
              Manage movies and series as first-class Studio projects.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
          >
            Create Show Project
          </button>
        </div>
        {isComposerOpen ? (
          <form onSubmit={handleCreate} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.24em] text-white/70">Title</span>
              <input
                required
                minLength={2}
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
                placeholder="Midnight Transmission"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.24em] text-white/70">Format</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as ShowProjectRecord["format"])}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="SERIES">Series</option>
                <option value="MOVIE">Movie</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.24em] text-white/70">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none"
                placeholder="What is this project about?"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
              >
                {isPending ? "Creating" : "Create Show Project"}
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Library</p>
            <h2 className="text-xl font-semibold">Active show projects</h2>
          </div>
          <p className="text-sm text-illuvrse-muted">{initialProjects.length} total</p>
        </div>
        {initialProjects.length === 0 ? (
          <p className="text-sm text-illuvrse-muted">No show projects yet. Create the first one above.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {initialProjects.map((project) => (
              <Link
                key={project.id}
                href={`/studio/show-projects/${project.slug}`}
                className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">{project.format}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{project.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/75">
                    {statusLabel[project.status]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-white/70">
                  {project.description || "No description yet."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                  <span>{project.currentUserRole ? roleLabel[project.currentUserRole] : project.slug}</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
