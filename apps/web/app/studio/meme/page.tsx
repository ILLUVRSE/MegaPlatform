/**
 * MemeMachine page.
 * Request/response: renders meme creation flow.
 * Guard: none; public for MVP.
 */
"use client";

import { useState } from "react";
import MemeUploader from "./components/MemeUploader";
import CaptionPicker from "./components/CaptionPicker";
import TemplatePicker from "./components/TemplatePicker";
import MemePreview from "./components/MemePreview";
import {
  createJob,
  createProject,
  getProject,
  publishProject,
  type AgentJob,
  type StudioProject
} from "@/lib/studioApi";
import { pollJob } from "@/lib/jobPolling";
import { getHostForCode } from "@/src/domains/party/client/storage";

export default function MemeStudioPage() {
  const [title, setTitle] = useState("Meme Drop");
  const [project, setProject] = useState<StudioProject | null>(null);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [template, setTemplate] = useState("Top/Bottom");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [partyCode, setPartyCode] = useState("");

  const handleCreate = async () => {
    const response = await createProject({ type: "MEME", title });
    setProject(response.project);
    setStatus("Project created.");
  };

  const handleCaptions = async () => {
    if (!project) return;
    setStatus("Generating captions...");
    const response = await createJob(project.id, { type: "MEME_CAPTIONS", input: { title } });
    setJobs((prev) => [...prev, response.job]);
    const finalJob = await pollJob(response.job.id, (job) => {
      setJobs((prev) => prev.map((entry) => (entry.id === job.id ? job : entry)));
    });
    const nextCaptions = (finalJob.outputJson?.captions as string[]) ?? [];
    setCaptions(nextCaptions);
    setSelectedCaption(nextCaptions[0] ?? null);
    setStatus("Captions ready.");
  };

  const handleRender = async () => {
    if (!project) return;
    setStatus("Rendering meme...");
    const response = await createJob(project.id, {
      type: "MEME_RENDER",
      input: { template, caption: selectedCaption, sourceUrl: sourceUrl }
    });
    setJobs((prev) => [...prev, response.job]);
    await pollJob(response.job.id, (job) => {
      setJobs((prev) => prev.map((entry) => (entry.id === job.id ? job : entry)));
    });
    const projectData = await getProject(project.id);
    const memeAsset = projectData.assets.find((item) => item.kind === "MEME_PNG") ?? null;
    setRenderUrl(memeAsset?.url ?? null);
    setStatus("Render complete.");
  };

  const handlePublish = async () => {
    if (!project) return;
    setStatus("Publishing to Shorts...");
    await publishProject(project.id, { title, caption: selectedCaption ?? "" });
    setStatus("Published to Shorts!");
  };

  const handleSendToParty = async () => {
    if (!partyCode || !renderUrl) return;
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
            assetUrl: renderUrl,
            title,
            order: 0
          }
        ]
      })
    });
    setStatus("Sent to party playlist.");
  };

  return (
    <div className="space-y-6">
      <header className="party-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">AI Studio</p>
        <h1 className="text-3xl font-semibold">MemeMachine</h1>
        <p className="text-sm text-illuvrse-muted">Create memes from uploads or short frames.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="party-card space-y-4">
            <label className="block text-sm font-semibold">
              Project title
              <input
                className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
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
              >
                Create Meme Project
              </button>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={handleCaptions}
                disabled={!project}
              >
                Generate Captions
              </button>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={handleRender}
                disabled={!project}
              >
                Render Meme
              </button>
              <button
                type="button"
                className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                onClick={handlePublish}
                disabled={!project || !renderUrl}
              >
                Publish to Shorts
              </button>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={handleSendToParty}
                disabled={!partyCode || !renderUrl}
              >
                Send to Party
              </button>
            </div>
            {status ? <p className="text-sm text-illuvrse-muted">{status}</p> : null}
          </div>

          <MemeUploader projectId={project?.id ?? null} onUploaded={setSourceUrl} />
          <TemplatePicker selected={template} onSelect={setTemplate} />
          <CaptionPicker captions={captions} selected={selectedCaption} onSelect={setSelectedCaption} />
        </div>
        <MemePreview sourceUrl={sourceUrl} renderUrl={renderUrl} caption={selectedCaption} />
      </div>
    </div>
  );
}
