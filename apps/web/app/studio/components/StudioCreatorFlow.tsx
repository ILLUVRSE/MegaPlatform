"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  StudioApiError,
  createJob,
  createProject,
  getProject,
  publishProject,
  type AgentJob,
  type StudioAsset,
  type StudioProject
} from "@/lib/studioApi";
import { pollJob } from "@/lib/jobPolling";

type Scene = {
  id: string;
  title: string;
  description: string;
  caption: string;
  take: number;
};

type Template = {
  id: string;
  name: string;
  format: string;
  description: string;
  tags: string[];
};

type AssetListItem = {
  id: string;
  label: string;
  detail: string;
};

const steps = [
  { id: "idea", title: "Idea", detail: "Prompt + template" },
  { id: "script", title: "Script Builder", detail: "Generate + edit" },
  { id: "scenes", title: "Scene Builder", detail: "Auto-generate" },
  { id: "audio", title: "Voice & Audio", detail: "Pick sound" },
  { id: "preview", title: "Preview", detail: "Render + captions" },
  { id: "publish", title: "Publish", detail: "Title + tags" }
];

const templates: Template[] = [
  {
    id: "viral-hook",
    name: "Viral Hook",
    format: "Short Format",
    description: "3-beat hook → payoff → CTA.",
    tags: ["hook", "viral", "cta"]
  },
  {
    id: "meme-pop",
    name: "Meme Pop",
    format: "Meme Template",
    description: "Punchline captions + reaction cut.",
    tags: ["meme", "caption", "reaction"]
  },
  {
    id: "podcast-highlight",
    name: "Podcast Highlight",
    format: "Highlight",
    description: "Quote-led clip with lower third.",
    tags: ["podcast", "quote", "highlight"]
  },
  {
    id: "storytime",
    name: "Storytime",
    format: "Story",
    description: "Setup → conflict → twist.",
    tags: ["story", "narrative", "twist"]
  },
  {
    id: "reaction-slam",
    name: "Reaction Slam",
    format: "Reaction",
    description: "Split-screen reaction + big reveal.",
    tags: ["reaction", "split", "reveal"]
  },
  {
    id: "game-highlight",
    name: "Highlight Reel",
    format: "Highlight",
    description: "Best moments + quick stats overlay.",
    tags: ["highlight", "fast", "sports"]
  }
];

const tones = ["Cinematic", "Playful", "Hype", "Deadpan", "Inspirational"];
const voices = ["Nova", "Echo", "Onyx", "Rhea", "Sage"];
const musicBeds = ["Pulse", "Lo-fi Drift", "Neon Rush", "Warm Glow", "None"];

const seedAssetLibrary = {
  Uploaded: [
    { id: "upl-1", label: "studio_intro.mp4", detail: "Video · 14s" },
    { id: "upl-2", label: "host_portrait.png", detail: "Image · 2.1MB" }
  ],
  Generated: [
    { id: "gen-1", label: "scene_01_broll.mp4", detail: "B-roll · 8s" },
    { id: "gen-2", label: "narration_take_3.wav", detail: "Voice · 18s" }
  ],
  Drafts: [
    { id: "dr-1", label: "Cosmic Party Recap", detail: "Short · Draft" },
    { id: "dr-2", label: "Golden Hour Story", detail: "Short · Draft" }
  ],
  Characters: [
    { id: "ch-1", label: "ILLU Host", detail: "Avatar · Placeholder" },
    { id: "ch-2", label: "Neon Narrator", detail: "Avatar · Placeholder" }
  ]
};

const makeId = () => Math.random().toString(36).slice(2, 9);

const buildScenesFromScript = (text: string): Scene[] => {
  const lines = text
    .split(/\n|\.|\?/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  const fallback = [
    "Hook the viewer with a bold statement.",
    "Show the setup with a quick visual.",
    "Reveal the twist or punchline.",
    "Close with a clear call-to-action."
  ];

  const seed = lines.length > 0 ? lines : fallback;

  return seed.map((line, index) => ({
    id: makeId(),
    title: `Scene ${index + 1}`,
    description: line,
    caption: line,
    take: 1
  }));
};

const mapScenesFromJob = (payload: { text: string; durationMs: number }[]): Scene[] =>
  payload.map((scene, index) => ({
    id: makeId(),
    title: `Scene ${index + 1}`,
    description: scene.text,
    caption: scene.text,
    take: 1
  }));

const assetDetailFor = (asset: StudioAsset): AssetListItem => {
  const kind = asset.kind.replace(/_/g, " ").toLowerCase();
  const label = asset.url.split("/").pop() ?? asset.kind;
  return {
    id: asset.id,
    label,
    detail: `${kind} · ${asset.url}`
  };
};

const renumberScenes = (scenes: Scene[]) =>
  scenes.map((scene, idx) => ({
    ...scene,
    title: `Scene ${idx + 1}`
  }));

const clampDurationMs = (value: number) => Math.max(1000, Math.min(3500, value));

const estimateDurationMs = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return clampDurationMs(1000 + words * 170);
};

const findLatestAsset = (assets: StudioAsset[], kind: StudioAsset["kind"]) =>
  [...assets].reverse().find((asset) => asset.kind === kind) ?? null;

export default function StudioCreatorFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId") ?? "";

  const [activeStep, setActiveStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [script, setScript] = useState("");
  const [tone, setTone] = useState(tones[0]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [voice, setVoice] = useState(voices[0]);
  const [music, setMusic] = useState(musicBeds[0]);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<"clean" | "impact" | "tiktok">("clean");
  const [previewStatus, setPreviewStatus] = useState("Not rendered yet");
  const [captionEditId, setCaptionEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("illuvrse, shorts");
  const [visibility, setVisibility] = useState("Public");
  const [publishStatus, setPublishStatus] = useState("");
  const [assetTab, setAssetTab] = useState<keyof typeof seedAssetLibrary>("Uploaded");
  const [voicePreview, setVoicePreview] = useState("Ready to preview");
  const [project, setProject] = useState<StudioProject | null>(null);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fieldIds = {
    idea: "studio-idea",
    script: "studio-script",
    tone: "studio-tone",
    voice: "studio-voice",
    music: "studio-music",
    captionStyle: "studio-caption-style",
    title: "studio-title",
    tags: "studio-tags",
    visibility: "studio-visibility"
  } as const;

  const stepLabel = useMemo(() => steps[activeStep]?.title ?? "", [activeStep]);
  const hasRenderedAsset = useMemo(
    () => Boolean(findLatestAsset(assets, "HLS_MANIFEST") ?? findLatestAsset(assets, "SHORT_MP4")),
    [assets]
  );
  const setOrUpdateJob = (job: AgentJob) => {
    setJobs((prev) => {
      const next = prev.filter((entry) => entry.id !== job.id);
      return [...next, job];
    });
  };
  const refreshProjectData = async (projectId: string) => {
    const projectData = await getProject(projectId);
    setProject(projectData.project);
    setJobs(projectData.jobs);
    setAssets(projectData.assets);
    return projectData;
  };
  const toErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof StudioApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error && error.message) return `${fallback}: ${error.message}`;
    return fallback;
  };

  useEffect(() => {
    if (!projectIdFromUrl) return;
    let cancelled = false;

    const fetchProject = async () => {
      try {
        setIsBusy(true);
        const payload = await getProject(projectIdFromUrl);
        if (cancelled) return;
        setProject(payload.project);
        setJobs(payload.jobs);
        setAssets(payload.assets);
        setTitle(payload.project.title);
        setIdea(payload.project.description ?? "");

        const latestScriptJob = payload.jobs
          .filter((job) => job.type === "SHORT_SCRIPT" && job.outputJson?.script)
          .slice(-1)[0];
        if (latestScriptJob?.outputJson?.script) {
          setScript(latestScriptJob.outputJson.script as string);
        }

        const latestScenesJob = payload.jobs
          .filter((job) => job.type === "SHORT_SCENES" && job.outputJson?.scenes)
          .slice(-1)[0];
        if (latestScenesJob?.outputJson?.scenes) {
          setScenes(mapScenesFromJob(latestScenesJob.outputJson.scenes as { text: string; durationMs: number }[]));
        }

        const hasAnyRender = findLatestAsset(payload.assets, "HLS_MANIFEST") || findLatestAsset(payload.assets, "SHORT_MP4");
        setPreviewStatus(hasAnyRender ? "Preview rendered already" : "Not rendered yet");
        setStatusMessage("Project loaded.");
      } catch (error) {
        if (!cancelled) setStatusMessage(toErrorMessage(error, "Unable to load project"));
      } finally {
        if (!cancelled) setIsBusy(false);
      }
    };

    void fetchProject();

    return () => {
      cancelled = true;
    };
  }, [projectIdFromUrl]);

  const syncUrlProject = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const ensureProject = async () => {
    if (project) return project;
    setIsBusy(true);
    try {
      const draftTitle = title.trim() || "Untitled Short";
      const response = await createProject({
        type: "SHORT",
        title: draftTitle,
        description: idea.trim() || ""
      });
      setProject(response.project);
      syncUrlProject(response.project.id);
      setTitle(response.project.title);
      setStatusMessage("Draft created.");
      return response.project;
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateScript = async () => {
    try {
      setIsBusy(true);
      const activeProject = await ensureProject();
      setStatusMessage("Generating script...");
      const response = await createJob(activeProject.id, {
        type: "SHORT_SCRIPT",
        input: {
          prompt: idea.trim() || "Create a short with a clear hook and payoff.",
          title: activeProject.title,
          tone,
          template: selectedTemplate?.name ?? "Original"
        }
      });
      setOrUpdateJob(response.job);
      const finalJob = await pollJob(response.job.id, (job) => {
        setOrUpdateJob(job);
      });
      if (finalJob.outputJson?.script) {
        setScript(finalJob.outputJson.script as string);
      }
      setStatusMessage("Script ready.");
    } catch (error) {
      setStatusMessage(toErrorMessage(error, "Script generation failed"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleAutoScenes = async () => {
    try {
      setIsBusy(true);
      const activeProject = await ensureProject();
      const sourceScript = script.trim() || idea.trim();
      if (!sourceScript) {
        setScenes(buildScenesFromScript(""));
        setStatusMessage("Add an idea or script first, then generate scenes.");
        return;
      }
      setStatusMessage("Generating scenes...");
      const response = await createJob(activeProject.id, {
        type: "SHORT_SCENES",
        input: {
          prompt: idea,
          title: activeProject.title,
          script: sourceScript,
          captionStyle
        }
      });
      setOrUpdateJob(response.job);
      const finalJob = await pollJob(response.job.id, (job) => {
        setOrUpdateJob(job);
      });
      if (finalJob.outputJson?.scenes) {
        setScenes(mapScenesFromJob(finalJob.outputJson.scenes as { text: string; durationMs: number }[]));
      } else {
        setScenes(buildScenesFromScript(sourceScript));
      }
      setStatusMessage("Scenes ready.");
    } catch (error) {
      setStatusMessage(toErrorMessage(error, "Scene generation failed"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRenderPreview = async () => {
    if (scenes.length === 0) {
      setPreviewStatus("Add scenes to render a preview.");
      return;
    }
    try {
      setIsBusy(true);
      const activeProject = await ensureProject();
      setPreviewStatus("Rendering preview...");
      const response = await createJob(activeProject.id, {
        type: "SHORT_RENDER",
        input: {
          prompt: idea,
          title: activeProject.title,
          script,
          scenes: scenes.map((scene) => ({
            text: scene.caption.trim() || scene.description.trim() || "Scene update.",
            durationMs: estimateDurationMs(scene.description)
          })),
          captionStyle,
          voice,
          music: musicEnabled ? music : "None"
        }
      });
      setOrUpdateJob(response.job);
      await pollJob(response.job.id, (job) => {
        setOrUpdateJob(job);
      });
      await refreshProjectData(activeProject.id);
      setPreviewStatus("Preview rendered just now");
      setStatusMessage("Render complete.");
    } catch (error) {
      setPreviewStatus("Render failed.");
      setStatusMessage(toErrorMessage(error, "Render failed"));
    } finally {
      setIsBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!hasRenderedAsset) {
      setPublishStatus("Render a preview before publishing.");
      setStatusMessage("Publish blocked until a render asset exists.");
      return;
    }
    try {
      setIsBusy(true);
      const activeProject = await ensureProject();
      const publishTitle = title.trim() || "Untitled Short";
      setPublishStatus("Publishing...");
      await publishProject(activeProject.id, { title: publishTitle, caption: idea.trim() });
      await refreshProjectData(activeProject.id);
      setPublishStatus("Published to Shorts.");
      setStatusMessage("Published.");
    } catch (error) {
      setPublishStatus(toErrorMessage(error, "Publish failed"));
      setStatusMessage(toErrorMessage(error, "Publish failed"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddScene = () => {
    setScenes((prev) => [
      ...prev,
      {
        id: makeId(),
        title: `Scene ${prev.length + 1}`,
        description: "New scene description.",
        caption: "New caption.",
        take: 1
      }
    ]);
  };

  const handleMoveScene = (index: number, direction: number) => {
    setScenes((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next.map((scene, idx) => ({
        ...scene,
        title: `Scene ${idx + 1}`
      }));
    });
  };

  const handleRemoveScene = (id: string) => {
    setScenes((prev) => renumberScenes(prev.filter((scene) => scene.id !== id)));
  };

  const handleRegenerateScene = (id: string) => {
    setScenes((prev) =>
      prev.map((scene) =>
        scene.id === id
          ? {
              ...scene,
              take: scene.take + 1,
              description: `${scene.description} (alt take ${scene.take + 1})`,
              caption: `${scene.caption} (alt take ${scene.take + 1})`
            }
          : scene
      )
    );
  };

  const assetItems = useMemo(() => {
    const uploads = assets
      .filter((asset) => asset.kind.endsWith("_UPLOAD"))
      .map(assetDetailFor);
    const generated = assets
      .filter((asset) => !asset.kind.endsWith("_UPLOAD"))
      .map(assetDetailFor);

    return {
      Uploaded: uploads.length > 0 ? uploads : seedAssetLibrary.Uploaded,
      Generated: generated.length > 0 ? generated : seedAssetLibrary.Generated,
      Drafts: seedAssetLibrary.Drafts,
      Characters: seedAssetLibrary.Characters
    };
  }, [assets]);
  const activityStatus = isBusy ? "Working..." : statusMessage;

  return (
    <div className="space-y-6">
      <section className="party-card space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">AI Studio</p>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Create shorts with a guided flow</h1>
            <p className="text-sm text-illuvrse-muted">
              Build a short end-to-end: idea → script → scenes → audio → preview → publish.
            </p>
            {project ? (
              <p className="text-xs text-illuvrse-muted">Project: {project.title} · {project.id}</p>
            ) : (
              <p className="text-xs text-illuvrse-muted">No active project yet.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#creator" className="party-button interactive-focus text-lg">Create a Short</a>
            <Link
              href="/shorts"
              className="interactive-focus text-xs font-semibold uppercase tracking-widest text-illuvrse-primary"
            >
              Remix a Short
            </Link>
          </div>
        </div>
      </section>

      <section id="creator" className="party-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Create a Short</p>
            <h2 className="text-2xl font-semibold">Step {activeStep + 1} · {stepLabel}</h2>
            <p className="text-sm text-illuvrse-muted">Navigate the creator flow with quick iterations.</p>
            {activityStatus ? (
              <p className="text-xs text-illuvrse-muted" role="status" aria-live="polite">
                {activityStatus}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`interactive-focus rounded-full border px-3 py-1 ${
                  index === activeStep
                    ? "border-illuvrse-primary text-illuvrse-primary"
                    : "border-white/10 text-illuvrse-muted"
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 0 && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              <label htmlFor={fieldIds.idea} className="text-sm font-semibold">Your short idea</label>
              <textarea
                id={fieldIds.idea}
                className="h-32 w-full rounded-md border border-white/10 bg-transparent p-3 text-sm"
                placeholder="Describe the hook, vibe, and payoff..."
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#templates"
                  className="interactive-focus text-xs font-semibold uppercase tracking-widest text-illuvrse-primary"
                >
                  Pick a template
                </a>
                {selectedTemplate && (
                  <span className="text-xs text-illuvrse-muted">
                    Selected: {selectedTemplate.name}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="party-button interactive-focus"
                  onClick={() => void ensureProject()}
                  disabled={isBusy}
                >
                  Save draft
                </button>
                <button
                  className="party-button interactive-focus"
                  onClick={handleGenerateScript}
                  disabled={isBusy}
                >
                  Generate script
                </button>
              </div>
            </div>
            <div className="space-y-3 rounded-md border border-white/10 p-4">
              <p className="text-sm font-semibold">Quick tips</p>
              <p className="text-xs text-illuvrse-muted">Keep it under 30 seconds, punchy, and visual.</p>
              <p className="text-xs text-illuvrse-muted">Use the template library for proven formats.</p>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">AI-generated script</p>
              <div className="flex flex-wrap items-center gap-2">
                <button className="party-button interactive-focus" onClick={handleGenerateScript} disabled={isBusy}>
                  Generate script
                </button>
                <button
                  className="party-button interactive-focus"
                  onClick={() => setScript((prev) => prev.trim() || "Add your script here...")}
                >
                  Use placeholder
                </button>
              </div>
            </div>
            <textarea
              id={fieldIds.script}
              className="h-40 w-full rounded-md border border-white/10 bg-transparent p-3 text-sm"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Your script will appear here..."
              aria-label="AI-generated script"
            />
            <div className="flex flex-wrap items-center gap-4">
              <label htmlFor={fieldIds.tone} className="text-sm font-semibold">Tone & style</label>
              <select
                id={fieldIds.tone}
                className="rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                {tones.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <span className="text-xs text-illuvrse-muted">Tone applied: {tone}</span>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Scene list</p>
              <div className="flex flex-wrap items-center gap-2">
                <button className="party-button interactive-focus" onClick={handleAutoScenes} disabled={isBusy}>
                  Auto-generate scenes
                </button>
                <button className="party-button interactive-focus" onClick={handleAddScene}>Add scene</button>
              </div>
            </div>
            <div className="space-y-3">
              {scenes.length === 0 && (
                <p className="text-sm text-illuvrse-muted">No scenes yet. Generate or add manually.</p>
              )}
              {scenes.map((scene, index) => (
                <div key={scene.id} className="rounded-md border border-white/10 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{scene.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button className="party-button interactive-focus" onClick={() => handleMoveScene(index, -1)} disabled={index === 0}>
                        Move up
                      </button>
                      <button
                        className="party-button interactive-focus"
                        onClick={() => handleMoveScene(index, 1)}
                        disabled={index === scenes.length - 1}
                      >
                        Move down
                      </button>
                      <button className="party-button interactive-focus" onClick={() => handleRemoveScene(scene.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="h-20 w-full rounded-md border border-white/10 bg-transparent p-2 text-sm"
                    value={scene.description}
                    aria-label={`${scene.title} description`}
                    onChange={(event) =>
                      setScenes((prev) =>
                        prev.map((item) =>
                          item.id === scene.id ? { ...item, description: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor={fieldIds.voice} className="text-sm font-semibold">Voice picker</label>
                <select
                  id={fieldIds.voice}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={voice}
                  onChange={(event) => setVoice(event.target.value)}
                >
                  {voices.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={fieldIds.music} className="text-sm font-semibold">Background music</label>
                <select
                  id={fieldIds.music}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={music}
                  onChange={(event) => setMusic(event.target.value)}
                >
                  {musicBeds.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={fieldIds.captionStyle} className="text-sm font-semibold">Caption style</label>
                <select
                  id={fieldIds.captionStyle}
                  className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                  value={captionStyle}
                  onChange={(event) => setCaptionStyle(event.target.value as "clean" | "impact" | "tiktok")}
                >
                  <option value="clean">Clean</option>
                  <option value="impact">Impact</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(event) => setMusicEnabled(event.target.checked)}
                  />
                  Music bed on
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sfxEnabled}
                    onChange={(event) => setSfxEnabled(event.target.checked)}
                  />
                  SFX on
                </label>
              </div>
            </div>
            <div className="rounded-md border border-white/10 p-4 space-y-3">
              <p className="text-sm font-semibold">Audio preview</p>
              <p className="text-xs text-illuvrse-muted">Voice: {voice}</p>
              <p className="text-xs text-illuvrse-muted">Music: {musicEnabled ? music : "Off"}</p>
              <p className="text-xs text-illuvrse-muted">SFX: {sfxEnabled ? "On" : "Off"}</p>
              <p className="text-xs text-illuvrse-muted">Caption style: {captionStyle}</p>
              <button
                className="party-button interactive-focus"
                onClick={() => setVoicePreview(`Previewed ${voice} just now`)}
              >
                Preview voice
              </button>
              <p className="text-xs text-illuvrse-muted" role="status" aria-live="polite">{voicePreview}</p>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Render preview</p>
                <p className="text-xs text-illuvrse-muted">{previewStatus}</p>
              </div>
              <button className="party-button interactive-focus" onClick={handleRenderPreview} disabled={isBusy}>
                Render preview
              </button>
            </div>
            <div className="space-y-3">
              {scenes.length === 0 && (
                <p className="text-sm text-illuvrse-muted">Scenes will appear here after you build them.</p>
              )}
              {scenes.map((scene) => (
                <div key={scene.id} className="rounded-md border border-white/10 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{scene.title} · Take {scene.take}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button className="party-button interactive-focus" onClick={() => handleRegenerateScene(scene.id)}>
                        Regenerate
                      </button>
                      <button className="party-button interactive-focus" onClick={() => setCaptionEditId(scene.id)}>
                        Edit captions
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-illuvrse-muted">{scene.description}</p>
                  {captionEditId === scene.id ? (
                    <textarea
                      className="h-16 w-full rounded-md border border-white/10 bg-transparent p-2 text-sm"
                      value={scene.caption}
                      aria-label={`${scene.title} caption`}
                      onChange={(event) =>
                        setScenes((prev) =>
                          prev.map((item) =>
                            item.id === scene.id ? { ...item, caption: event.target.value } : item
                          )
                        )
                      }
                    />
                  ) : (
                    <p className="text-xs">Caption: {scene.caption}</p>
                  )}
                  {captionEditId === scene.id && (
                    <button className="party-button interactive-focus" onClick={() => setCaptionEditId(null)}>
                      Done editing
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeStep === 5 && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              <label htmlFor={fieldIds.title} className="text-sm font-semibold">Title</label>
              <input
                id={fieldIds.title}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give your short a title"
              />
              <label htmlFor={fieldIds.tags} className="text-sm font-semibold">Tags</label>
              <input
                id={fieldIds.tags}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
              <label htmlFor={fieldIds.visibility} className="text-sm font-semibold">Visibility</label>
              <select
                id={fieldIds.visibility}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
              >
                <option value="Public">Public</option>
                <option value="Unlisted">Unlisted</option>
                <option value="Private">Private</option>
              </select>
              <button className="party-button interactive-focus" onClick={handlePublish} disabled={isBusy || !hasRenderedAsset}>
                Publish
              </button>
            </div>
            <div className="rounded-md border border-white/10 p-4 space-y-3">
              <p className="text-sm font-semibold">Publish status</p>
              <p className="text-xs text-illuvrse-muted" role="status" aria-live="polite">{publishStatus || "Ready when you are."}</p>
              <div className="text-xs text-illuvrse-muted">
                <p>Template: {selectedTemplate?.name ?? "Original"}</p>
                <p>Scenes: {scenes.length}</p>
                <p>Audio: {voice} · {musicEnabled ? music : "No music"}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="text-xs text-illuvrse-muted">Step {activeStep + 1} of {steps.length}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="party-button interactive-focus"
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
            >
              Back
            </button>
            <button
              className="party-button interactive-focus"
              onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={activeStep === steps.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section id="templates" className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Templates Library</p>
            <h2 className="text-2xl font-semibold">Choose a proven short format</h2>
          </div>
          {selectedTemplate && (
            <span className="text-xs text-illuvrse-muted">Using: {selectedTemplate.name}</span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`interactive-focus rounded-md border p-4 text-left space-y-2 ${
                selectedTemplate?.id === template.id
                  ? "border-illuvrse-primary"
                  : "border-white/10"
              }`}
              onClick={() => {
                setSelectedTemplate(template);
                setActiveStep(0);
              }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{template.format}</p>
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <p className="text-xs text-illuvrse-muted">{template.description}</p>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-illuvrse-muted">
                {template.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="party-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Asset Library</p>
            <h2 className="text-2xl font-semibold">Your uploads, generations, and drafts</h2>
          </div>
          <button className="party-button interactive-focus" disabled>
            Upload (Coming soon)
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(assetItems) as Array<keyof typeof assetItems>).map((tab) => (
            <button
              key={tab}
              onClick={() => setAssetTab(tab as keyof typeof seedAssetLibrary)}
              className={`interactive-focus rounded-full border px-3 py-1 ${
                tab === assetTab
                  ? "border-illuvrse-primary text-illuvrse-primary"
                  : "border-white/10 text-illuvrse-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {assetItems[assetTab].length === 0 && (
            <p className="text-sm text-illuvrse-muted">No assets yet.</p>
          )}
          {assetItems[assetTab].map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 p-3">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-illuvrse-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
