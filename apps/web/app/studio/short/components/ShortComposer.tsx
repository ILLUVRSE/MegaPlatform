/**
 * Short generator composer.
 * Request/response: creates projects, jobs, and publishes to shorts.
 * Guard: client component.
 */
"use client";

import { useState } from "react";
import JobTimeline from "./JobTimeline";
import ShortPreview from "./ShortPreview";
import {
  createJob,
  createProject,
  getProject,
  publishProject,
  type AgentJob,
  type StudioAsset,
  type StudioProject
} from "@/lib/studioApi";
import { pollJob } from "@/lib/jobPolling";
import { getHostForCode } from "@/src/domains/party/client/storage";

export default function ShortComposer() {
  const [title, setTitle] = useState("Nebula Nights Short");
  const [prompt, setPrompt] = useState("A cosmic signal disrupts the broadcast.");
  const [captionStyle, setCaptionStyle] = useState<"clean" | "impact" | "tiktok">("clean");
  const [project, setProject] = useState<StudioProject | null>(null);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [script, setScript] = useState<string | null>(null);
  const [scenes, setScenes] = useState<{ text: string; durationMs: number }[] | null>(null);
  const [asset, setAsset] = useState<StudioAsset | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [partyCode, setPartyCode] = useState("");

  const canPublish = Boolean(project && asset);

  const handleCreate = async () => {
    const response = await createProject({ type: "SHORT", title, description: prompt });
    setProject(response.project);
    setStatus("Project created.");
  };

  const handleJob = async (type: AgentJob["type"]) => {
    if (!project) return;
    setStatus(`Running ${type}...`);
    const response = await createJob(project.id, {
      type,
      input: { prompt, title, script, scenes, captionStyle, sourceUrl: asset?.url }
    });
    setJobs((prev) => [...prev, response.job]);
    const finalJob = await pollJob(response.job.id, (job) => {
      setJobs((prev) => prev.map((entry) => (entry.id === job.id ? job : entry)));
    });

    if (type === "SHORT_SCRIPT" && finalJob.outputJson?.script) {
      setScript(finalJob.outputJson.script as string);
    }
    if (type === "SHORT_SCENES" && finalJob.outputJson?.scenes) {
      setScenes(finalJob.outputJson.scenes as { text: string; durationMs: number }[]);
    }
    if (type === "SHORT_RENDER") {
      const projectData = await getProject(project.id);
      const renderAsset = projectData.assets.find((item) => item.kind === "SHORT_MP4") ?? null;
      setAsset(renderAsset);
    }

    setStatus(`${type} complete.`);
  };

  const handlePublish = async () => {
    if (!project) return;
    setPublishing(true);
    setStatus("Publishing to Shorts...");
    await publishProject(project.id, { title, caption: prompt });
    setPublishing(false);
    setStatus("Published to Shorts!");
  };

  const handleSendToParty = async () => {
    if (!partyCode || !asset) return;
    const hostId = getHostForCode(partyCode);
    if (!hostId) {
      setStatus("Host ID missing for party.");
      return;
    }
    await fetch(`/api/party/${partyCode}/playlist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostId,
        items: [
          {
            assetUrl: asset.url,
            title,
            order: 0
          }
        ]
      })
    });
    setStatus("Sent to party playlist.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="party-card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Project Setup</p>
            <h2 className="text-2xl font-semibold">Short Generator</h2>
          </div>
          <label className="block text-sm font-semibold">
            Title
            <input
              className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Prompt
            <textarea
              className="mt-2 h-24 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Caption style
            <select
              className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
              value={captionStyle}
              onChange={(event) => setCaptionStyle(event.target.value as "clean" | "impact" | "tiktok")}
            >
              <option value="clean">Clean</option>
              <option value="impact">Impact</option>
              <option value="tiktok">TikTok</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Party code (optional)
            <input
              className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
              value={partyCode}
              onChange={(event) => setPartyCode(event.target.value.toUpperCase())}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={handleCreate}
              data-testid="studio-create-project"
            >
              Create Project
            </button>
            <button
              type="button"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={() => handleJob("SHORT_SCRIPT")}
              disabled={!project}
              data-testid="studio-generate-script"
            >
              Generate Script
            </button>
            <button
              type="button"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={() => handleJob("SHORT_SCENES")}
              disabled={!project}
              data-testid="studio-generate-scenes"
            >
              Generate Scenes
            </button>
            <button
              type="button"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={() => handleJob("SHORT_RENDER")}
              disabled={!project}
              data-testid="studio-render-short"
            >
              Render Short
            </button>
            <button
              type="button"
              className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              data-testid="studio-publish-short"
            >
              Publish to Shorts
            </button>
            <button
              type="button"
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              onClick={handleSendToParty}
              disabled={!partyCode || !asset}
            >
              Send to Party
            </button>
          </div>
          {status ? (
            <p className="text-sm text-illuvrse-muted" data-testid="studio-status">
              {status}
            </p>
          ) : null}
        </div>
        <JobTimeline jobs={jobs} />
      </div>
      <ShortPreview script={script} scenes={scenes} asset={asset} />
    </div>
  );
}
