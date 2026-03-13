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

type Props = {
  episode: EpisodeRecord;
  initialScenes: SceneRecord[];
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

export default function ShowEpisodeSceneEditor({ episode, initialScenes }: Props) {
  const [scenes, setScenes] = useState(initialScenes);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreateScene() {
    setIsCreating(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episode.id}/scenes`, {
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

    const response = await fetch(`/api/studio/episodes/${episode.id}/scenes/reorder`, {
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
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{formatEpisodeCode(episode)}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{episode.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {episode.synopsis || "No episode synopsis yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateScene}
            disabled={isCreating}
            className="interactive-focus rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
          >
            {isCreating ? "Creating" : "Create Scene"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{episode.status}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Scenes</p>
            <p className="mt-2 text-lg font-semibold text-white">{scenes.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Template</p>
            <p className="mt-2 text-lg font-semibold text-white">{episode.templateType}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Slug</p>
            <p className="mt-2 text-lg font-semibold text-white">{episode.slug}</p>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
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
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-lg font-semibold text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorder(scene.id, -1)}
                      disabled={index === 0 || activeSceneId === scene.id}
                      className="interactive-focus rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(scene.id, 1)}
                      disabled={index === scenes.length - 1 || activeSceneId === scene.id}
                      className="interactive-focus rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white disabled:opacity-40"
                    >
                      Down
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="space-y-2 text-sm text-white/70">
                    <span className="block text-xs uppercase tracking-[0.2em] text-white/50">Start intent</span>
                    <input
                      type="number"
                      min="0"
                      value={scene.startIntentSeconds ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id
                              ? {
                                  ...entry,
                                  startIntentSeconds:
                                    event.target.value === "" ? null : Number(event.target.value)
                                }
                              : entry
                          )
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/70">
                    <span className="block text-xs uppercase tracking-[0.2em] text-white/50">End intent</span>
                    <input
                      type="number"
                      min="0"
                      value={scene.endIntentSeconds ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id
                              ? {
                                  ...entry,
                                  endIntentSeconds:
                                    event.target.value === "" ? null : Number(event.target.value)
                                }
                              : entry
                          )
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/70">
                    <span className="block text-xs uppercase tracking-[0.2em] text-white/50">Tags</span>
                    <input
                      type="text"
                      value={scene.tags?.join(", ") ?? ""}
                      onChange={(event) =>
                        setScenes((current) =>
                          current.map((entry) =>
                            entry.id === scene.id
                              ? { ...entry, tags: parseTags(event.target.value) }
                              : entry
                          )
                        )
                      }
                      placeholder="intro, dialogue, transition"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2 text-sm text-white/70">
                  <span className="block text-xs uppercase tracking-[0.2em] text-white/50">Script</span>
                  <textarea
                    value={scene.scriptText}
                    onChange={(event) =>
                      setScenes((current) =>
                        current.map((entry) =>
                          entry.id === scene.id ? { ...entry, scriptText: event.target.value } : entry
                        )
                      )
                    }
                    rows={10}
                    className="min-h-[220px] w-full rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/60"
                    placeholder="Write the scene action, dialogue, and production notes here."
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveScene(scene)}
                    disabled={activeSceneId === scene.id}
                    className="interactive-focus rounded-full bg-cyan-300 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 disabled:opacity-60"
                  >
                    {activeSceneId === scene.id ? "Saving" : "Save Scene"}
                  </button>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Updated {new Date(scene.updatedAt).toLocaleString()}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
