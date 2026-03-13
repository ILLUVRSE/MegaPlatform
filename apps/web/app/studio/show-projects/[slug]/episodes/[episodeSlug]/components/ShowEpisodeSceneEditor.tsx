"use client";

import { useState } from "react";
import type { StudioPublishQcResult } from "@/lib/studioPublishQc";

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
  sourceShowId: string;
  sourceEpisodeId: string;
  sourceSceneId: string | null;
  sourceTimestampSeconds: number | null;
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

type ShotlistSuggestionRecord = {
  id: string;
  showEpisodeId: string;
  showSceneId: string | null;
  shotNumber: number;
  title: string;
  framing: string;
  cameraMotion: string;
  lens: string | null;
  durationSeconds: number;
  rationale: string | null;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  sourceSceneNumber: number | null;
  sourceSceneTitle: string | null;
};

type Props = {
  episode: EpisodeRecord;
  initialPublishQc: StudioPublishQcResult | null;
  initialScenes: SceneRecord[];
  initialShortDrafts: ShortDraftRecord[];
  initialShotlistSuggestions: ShotlistSuggestionRecord[];
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

function renderQcPanel(qc: StudioPublishQcResult | null) {
  if (!qc) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-black/20 p-3 text-sm text-white/60">
        QC unavailable for this episode.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Pre-publish QC</p>
        <p
          className={`text-[11px] uppercase tracking-[0.2em] ${
            qc.summary.blockingFailures > 0
              ? "text-rose-200"
              : qc.summary.warnings > 0
                ? "text-amber-100"
                : "text-emerald-200"
          }`}
        >
          {qc.canPublish
            ? qc.summary.warnings > 0
              ? `${qc.summary.warnings} warning${qc.summary.warnings === 1 ? "" : "s"}`
              : "Ready to publish"
            : `${qc.summary.blockingFailures} blocking failure${qc.summary.blockingFailures === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="grid gap-2">
        {qc.checks.map((check) => (
          <div key={check.code} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">{check.label}</p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                  check.status === "fail"
                    ? "border border-rose-300/30 bg-rose-400/10 text-rose-100"
                    : check.status === "warn"
                      ? "border border-amber-300/30 bg-amber-300/10 text-amber-100"
                      : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                }`}
              >
                {check.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/65">{check.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShowEpisodeSceneEditor({
  episode,
  initialPublishQc,
  initialScenes,
  initialShortDrafts,
  initialShotlistSuggestions,
  permissions
}: Props) {
  const [episodeState, setEpisodeState] = useState(episode);
  const [publishQc, setPublishQc] = useState(initialPublishQc);
  const [scenes, setScenes] = useState(initialScenes);
  const [shortDrafts, setShortDrafts] = useState(initialShortDrafts);
  const [shotlistSuggestions, setShotlistSuggestions] = useState(initialShotlistSuggestions);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [isGeneratingShotlist, setIsGeneratingShotlist] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canEditScenes = permissions.editScenes;
  const canPublish = permissions.publish;
  const shotlistSuggestionsByScene = scenes.map((scene) => ({
    scene,
    suggestions: shotlistSuggestions.filter((suggestion) => suggestion.showSceneId === scene.id)
  }));

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

  async function handleGenerateShotlist() {
    setIsGeneratingShotlist(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/studio/episodes/${episodeState.id}/generate-shotlist`, {
      method: "POST"
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      suggestions?: ShotlistSuggestionRecord[];
      counts?: {
        scenes: number;
        suggestions: number;
        replaced: number;
      };
    };

    setIsGeneratingShotlist(false);

    if (!response.ok || !payload.suggestions || !payload.counts) {
      setError(payload.error ?? "Unable to generate draft shotlist.");
      return;
    }

    setShotlistSuggestions(payload.suggestions);
    setNotice(
      `Generated ${payload.counts.suggestions} draft shot suggestions across ${payload.counts.scenes} scenes.`
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
      qc?: StudioPublishQcResult | null;
    };

    setIsPublishing(false);

    if (!response.ok || !payload.episode) {
      if (payload.qc) {
        setPublishQc(payload.qc);
      }
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
              disabled={!canPublish || isPublishing || !(publishQc?.canPublish ?? false)}
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

        <div className="md:col-span-5">{renderQcPanel(publishQc)}</div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Shotlist Assistant</p>
            <h2 className="text-xl font-semibold">Draft shotlist</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Deterministic draft coverage suggestions derived from scene text length, tags, and local defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateShotlist}
            disabled={!canEditScenes || isGeneratingShotlist || scenes.length === 0}
            className="interactive-focus rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100 disabled:opacity-40"
          >
            {isGeneratingShotlist ? "Generating" : "Generate Draft Shotlist"}
          </button>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
          All suggestions are marked draft and should be reviewed before production planning.
        </p>

        {shotlistSuggestions.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-illuvrse-muted">
            No shotlist suggestions generated yet.
          </div>
        ) : (
          <div className="space-y-4">
            {shotlistSuggestionsByScene.map(({ scene, suggestions }) => (
              <article key={scene.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Scene {scene.sceneNumber}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{scene.title}</h3>
                  </div>
                  <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                    Draft suggestions
                  </div>
                </div>

                {suggestions.length === 0 ? (
                  <p className="mt-4 text-sm text-illuvrse-muted">No draft suggestions for this scene yet.</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion.id} className="rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                              Shot {suggestion.shotNumber} · Draft
                            </p>
                            <h4 className="mt-2 text-base font-semibold text-white">{suggestion.title}</h4>
                          </div>
                          <div className="text-right text-xs uppercase tracking-[0.2em] text-white/55">
                            <p>{suggestion.framing}</p>
                            <p className="mt-1">{suggestion.cameraMotion}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-3">
                          <p>Lens: {suggestion.lens ?? "Default"}</p>
                          <p>Duration: {suggestion.durationSeconds}s</p>
                          <p>Status: {suggestion.isDraft ? "Draft" : "Locked"}</p>
                        </div>

                        {suggestion.rationale ? (
                          <p className="mt-4 text-sm text-white/65">{suggestion.rationale}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
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
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">
                  Source link ready: show {draft.sourceShowId.slice(0, 8)} · episode {draft.sourceEpisodeId.slice(0, 8)}
                  {draft.sourceTimestampSeconds !== null
                    ? ` · ${formatClipTimestamp(draft.sourceTimestampSeconds)}`
                    : ""}
                </p>
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
