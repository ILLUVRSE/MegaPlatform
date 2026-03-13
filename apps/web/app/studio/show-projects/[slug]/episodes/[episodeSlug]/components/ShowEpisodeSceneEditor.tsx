"use client";

import { useState } from "react";

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
  publishedAt: string | null;
  templateType: "STANDARD_EPISODE" | "COLD_OPEN_EPISODE" | "MOVIE_CHAPTER";
  createdAt: string;
  updatedAt: string;
};

type SceneRecord = {
  id: string;
  showEpisodeId: string;
  sceneNumber: number;
  title: string;
  scriptText: string;
  startIntentSeconds: number | null;
  endIntentSeconds: number | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
};

type ShortDraftRecord = {
  id: string;
  showEpisodeId: string;
  showSceneId: string;
  title: string;
  clipStartSeconds: number;
  clipEndSeconds: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sourceShowTitle: string;
  sourceEpisodeTitle: string;
  sourceSceneNumber: number;
  sourceSceneTitle: string;
};

type Props = {
  episode: EpisodeRecord;
  initialScenes: SceneRecord[];
  initialShortDrafts: ShortDraftRecord[];
  permissions: {
    read: boolean;
    editProject: boolean;
    editEpisodes: boolean;
    editScenes: boolean;
    editExtras: boolean;
    publish: boolean;
    manageCollaborators: boolean;
  };
};

function formatEpisodeCode(episode: EpisodeRecord) {
  if (episode.templateType === "MOVIE_CHAPTER") {
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

function parseTags(value: string) {
  const tags = Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );

  return tags.length > 0 ? tags : null;
}

function formatClipTimestamp(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ShowEpisodeSceneEditor({ episode, initialScenes, initialShortDrafts, permissions }: Props) {
  const [episodeState, setEpisodeState] = useState(episode);
  const [scenes, setScenes] = useState(initialScenes);
  const [shortDrafts, setShortDrafts] = useState(initialShortDrafts);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canEditScenes = permissions.editScenes;
  const canPublish = permissions.publish;

  async function handleCreateScene() {
    setIsCreating(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeState.id}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      scene?: SceneRecord;
    };

    setIsCreating(false);

    if (!response.ok || !payload.scene) {
      setError(payload.error ?? "Unable to create scene.");
      return;
    }

    const createdScene = payload.scene;
    setScenes((current) => [...current, createdScene]);
    setNotice(`Created ${createdScene.title}.`);
  }

  async function handleSaveScene(scene: SceneRecord) {
    setActiveSceneId(scene.id);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: scene.title,
        scriptText: scene.scriptText,
        startIntentSeconds: scene.startIntentSeconds,
        endIntentSeconds: scene.endIntentSeconds,
        tags: scene.tags
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      scene?: SceneRecord;
    };

    setActiveSceneId(null);

    if (!response.ok || !payload.scene) {
      setError(payload.error ?? "Unable to save scene.");
      return;
    }

    const nextScene = payload.scene;
    setScenes((current) => current.map((entry) => (entry.id === nextScene.id ? nextScene : entry)));
    setNotice(`Saved ${nextScene.title}.`);
  }

  async function handleGenerateShortDrafts() {
    setIsGeneratingDrafts(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeState.id}/generate-shorts`, {
      method: "POST"
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      drafts?: ShortDraftRecord[];
      counts?: {
        created: number;
        updated: number;
        total: number;
      };
    };

    setIsGeneratingDrafts(false);

    if (!response.ok || !payload.drafts || !payload.counts) {
      setError(payload.error ?? "Unable to generate shorts drafts.");
      return;
    }

    setShortDrafts(payload.drafts);
    setNotice(
      `Generated shorts drafts: ${payload.counts.created} new, ${payload.counts.updated} refreshed, ${payload.counts.total} total.`
    );
  }

  async function handlePublishEpisode() {
    setIsPublishing(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeState.id}/publish`, {
      method: "POST"
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      episode?: EpisodeRecord;
      watchShow?: { slug: string };
      watchEpisode?: { id: string };
    };

    setIsPublishing(false);

    if (!response.ok || !payload.episode) {
      setError(payload.error ?? "Unable to publish episode.");
      return;
    }

    setEpisodeState(payload.episode);
    setNotice(
      `Published to Watch: /watch/show/${payload.watchShow?.slug ?? "show"} · episode ${payload.watchEpisode?.id ?? payload.episode.id}`
    );
  }

  async function handleReorder(sceneId: string, direction: -1 | 1) {
    const currentIndex = scenes.findIndex((scene) => scene.id === sceneId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= scenes.length) {
      return;
    }

    const nextScenes = [...scenes];
    const [movedScene] = nextScenes.splice(currentIndex, 1);
    nextScenes.splice(nextIndex, 0, movedScene);

    setActiveSceneId(sceneId);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeState.id}/scenes/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds: nextScenes.map((scene) => scene.id) })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      scenes?: SceneRecord[];
    };

    setActiveSceneId(null);

    if (!response.ok || !payload.scenes) {
      setError(payload.error ?? "Unable to reorder scenes.");
      return;
    }

    setScenes(payload.scenes);
    setNotice(`Reordered ${movedScene.title}.`);
  }

  return (
    <div className="space-y-4">
      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{formatEpisodeCode(episodeState)}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{episodeState.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {episodeState.synopsis || "No episode synopsis yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePublishEpisode}
              disabled={!canPublish || isPublishing}
              className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 disabled:opacity-50"
            >
              {isPublishing ? "Publishing" : "Publish to Watch"}
            </button>
            <button
              type="button"
              onClick={handleCreateScene}
              disabled={!canEditScenes || isCreating}
              className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
            >
              {isCreating ? "Creating" : "Create Scene"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{episodeState.status}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Scenes</p>
            <p className="mt-2 text-lg font-semibold text-white">{scenes.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Short drafts</p>
            <p className="mt-2 text-lg font-semibold text-white">{shortDrafts.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Template</p>
            <p className="mt-2 text-lg font-semibold text-white">{episodeState.templateType}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Slug</p>
            <p className="mt-2 text-lg font-semibold text-white">{episodeState.slug}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Published</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {episodeState.publishedAt ? new Date(episodeState.publishedAt).toLocaleDateString() : "Not published"}
          </p>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Shorts Pipeline</p>
            <h2 className="text-xl font-semibold">Generated drafts</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Generate one draft short per scene. This is metadata only and keeps placeholder clip timestamps until editing/render is built.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateShortDrafts}
            disabled={
              !canEditScenes ||
              isGeneratingDrafts ||
              scenes.length === 0 ||
              (episodeState.status !== "READY" && episodeState.status !== "PUBLISHED")
            }
            className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 disabled:opacity-40"
          >
            {isGeneratingDrafts ? "Generating" : "Generate Shorts Drafts"}
          </button>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {episodeState.status === "READY" || episodeState.status === "PUBLISHED"
            ? "Generation is enabled for ready episodes."
            : "Set episode status to READY before generating shorts drafts."}
        </p>

        {shortDrafts.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No shorts drafts generated yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {shortDrafts.map((draft) => (
              <article key={draft.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                      Scene {draft.sourceSceneNumber}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{draft.title}</h3>
                    <p className="mt-2 text-sm text-white/70">
                      {draft.sourceShowTitle} · {draft.sourceEpisodeTitle} · {draft.sourceSceneTitle}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    {formatClipTimestamp(draft.clipStartSeconds)} - {formatClipTimestamp(draft.clipEndSeconds)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Script Editor</p>
            <h2 className="text-xl font-semibold">Scene blocks</h2>
          </div>
          <p className="text-sm text-illuvrse-muted">
            Plain text only. Each scene can later be linked to footage and timing.
          </p>
        </div>

        {scenes.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No scenes yet. Create the first scene to start structuring the episode script.
          </div>
        ) : (
          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <article key={scene.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                      Scene {scene.sceneNumber}
                    </p>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id ? { ...entry, title: event.target.value } : entry
                          )
                        )
                      }
                      disabled={!canEditScenes}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-lg font-semibold text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorder(scene.id, -1)}
                      disabled={!canEditScenes || index === 0 || activeSceneId === scene.id}
                      className="interactive-focus rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(scene.id, 1)}
                      disabled={!canEditScenes || index === scenes.length - 1 || activeSceneId === scene.id}
                      className="interactive-focus rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveScene(scene)}
                      disabled={!canEditScenes || activeSceneId === scene.id}
                      className="interactive-focus rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-950 disabled:opacity-40"
                    >
                      {activeSceneId === scene.id ? "Saving" : "Save Scene"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/55">Start intent</span>
                    <input
                      type="number"
                      min={0}
                      value={scene.startIntentSeconds ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id
                              ? {
                                  ...entry,
                                  startIntentSeconds:
                                    event.target.value === "" ? null : Number.parseInt(event.target.value, 10)
                                }
                              : entry
                          )
                        )
                      }
                      disabled={!canEditScenes}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/55">End intent</span>
                    <input
                      type="number"
                      min={0}
                      value={scene.endIntentSeconds ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id
                              ? {
                                  ...entry,
                                  endIntentSeconds:
                                    event.target.value === "" ? null : Number.parseInt(event.target.value, 10)
                                }
                              : entry
                          )
                        )
                      }
                      disabled={!canEditScenes}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/55">Tags</span>
                    <input
                      type="text"
                      value={scene.tags?.join(", ") ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id ? { ...entry, tags: parseTags(event.target.value) } : entry
                          )
                        )
                      }
                      disabled={!canEditScenes}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                      placeholder="intro, dialogue, transition"
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/55">Script</span>
                  <textarea
                    value={scene.scriptText}
                    onChange={(event) =>
                      setScenes((current) =>
                        current.map((entry) =>
                          entry.id === scene.id ? { ...entry, scriptText: event.target.value } : entry
                        )
                      )
                    }
                    disabled={!canEditScenes}
                    className="min-h-48 w-full rounded-3xl border border-white/10 bg-slate-950/50 px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    placeholder="Write the scene action, dialogue, and production notes here."
                  />
                </label>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
