/**
 * Studio ops jobs view.
 * Request/response: fetches ops jobs and renders filters, table, and details drawer.
 * Guard: client component.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = ["FAILED", "PROCESSING", "QUEUED", "COMPLETED"] as const;
const TYPE_OPTIONS = [
  "ALL",
  "SHORT_SCRIPT",
  "SHORT_SCENES",
  "SHORT_RENDER",
  "MEME_CAPTIONS",
  "MEME_RENDER",
  "VIDEO_CLIP_EXTRACT",
  "VIDEO_TRANSCODE",
  "THUMBNAIL_GENERATE"
] as const;

const RANGE_OPTIONS = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "3d", value: 72 },
  { label: "7d", value: 168 }
] as const;

type OpsJob = {
  id: string;
  projectId: string;
  projectTitle: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts?: number | null;
  retryable?: boolean;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  durationMs?: number | null;
  error?: string | null;
};

type JobDetail = {
  job: {
    id: string;
    projectId: string;
    projectTitle: string;
    type: string;
    status: string;
    inputJson: Record<string, unknown>;
    outputJson?: Record<string, unknown> | null;
    error?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  assets: { id: string; kind: string; url: string }[];
};

export default function OpsJobs() {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("FAILED");
  const [jobType, setJobType] = useState<(typeof TYPE_OPTIONS)[number]>("ALL");
  const [sinceHours, setSinceHours] = useState<number>(24);
  const [jobs, setJobs] = useState<OpsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const detailJob = useMemo(() => detail?.job ?? null, [detail]);

  const fetchJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", status);
    if (jobType !== "ALL") params.set("type", jobType);
    params.set("sinceHours", String(sinceHours));
    params.set("limit", "50");

    const response = await fetch(`/api/studio/ops/jobs?${params.toString()}`);
    if (!response.ok) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { jobs: OpsJob[] };
    setJobs(payload.jobs ?? []);
    setLoading(false);
  };

  const fetchDetail = async (jobId: string) => {
    setDetailLoading(true);
    const response = await fetch(`/api/studio/ops/jobs/${jobId}`);
    if (!response.ok) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    const payload = (await response.json()) as JobDetail;
    setDetail(payload);
    setDetailLoading(false);
  };

  useEffect(() => {
    void fetchJobs();
  }, [status, jobType, sinceHours]);

  useEffect(() => {
    if (!detailJobId) return;
    void fetchDetail(detailJobId);
  }, [detailJobId]);

  const handleRetry = async (jobId: string) => {
    setActionStatus("Retrying job...");
    const response = await fetch(`/api/studio/ops/jobs/${jobId}/retry`, { method: "POST" });
    if (!response.ok) {
      setActionStatus("Retry failed.");
      return;
    }
    setActionStatus("Retry queued.");
    await fetchJobs();
  };

  const handleCancel = async (jobId: string) => {
    setActionStatus("Cancelling job...");
    const response = await fetch(`/api/studio/ops/jobs/${jobId}/cancel`, { method: "POST" });
    if (!response.ok) {
      setActionStatus("Cancel failed.");
      return;
    }
    setActionStatus("Job cancelled.");
    await fetchJobs();
  };

  const formatDuration = (durationMs?: number | null) => {
    if (!durationMs || durationMs <= 0) return "-";
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const projectHrefForJob = (type: string) => {
    if (type.startsWith("SHORT")) return "/studio/short";
    if (type.startsWith("MEME")) return "/studio/meme";
    return "/studio";
  };

  return (
    <div className="party-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Job failures</h2>
          <p className="text-sm text-illuvrse-muted">Track failed jobs, inspect logs, and requeue.</p>
        </div>
        {actionStatus ? <p className="text-xs text-illuvrse-muted">{actionStatus}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Status
          <select
            className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Job type
          <select
            className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
            value={jobType}
            onChange={(event) => setJobType(event.target.value as typeof jobType)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Time range
          <select
            className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
            value={sinceHours}
            onChange={(event) => setSinceHours(Number(event.target.value))}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Last {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-[0.3em] text-illuvrse-muted">
            <tr>
              <th className="py-2">Created</th>
              <th className="py-2">Project</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Attempts</th>
              <th className="py-2">Duration</th>
              <th className="py-2">Error</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td className="py-3 text-illuvrse-muted" colSpan={8}>
                  Loading jobs...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td className="py-3 text-illuvrse-muted" colSpan={8}>
                  No jobs found for this filter.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-t border-illuvrse-border">
                  <td className="py-3 text-xs text-illuvrse-muted">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <p className="font-semibold text-illuvrse-text">{job.projectTitle}</p>
                    <p className="text-[11px] text-illuvrse-muted">{job.projectId}</p>
                  </td>
                  <td className="py-3 font-semibold">{job.type}</td>
                  <td className="py-3 text-illuvrse-muted">{job.status}</td>
                  <td className="py-3 text-illuvrse-muted">
                    {job.maxAttempts ? `${job.attempts}/${job.maxAttempts}` : `${job.attempts}`}
                    {job.retryable && job.nextRetryAt ? (
                      <p className="text-[10px] uppercase tracking-[0.2em]">Retry {new Date(job.nextRetryAt).toLocaleTimeString()}</p>
                    ) : null}
                  </td>
                  <td className="py-3 text-illuvrse-muted">{formatDuration(job.durationMs)}</td>
                  <td className="py-3 text-illuvrse-muted">
                    {job.error ? `${job.error.slice(0, 80)}${job.error.length > 80 ? "…" : ""}` : "-"}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
                        onClick={() => setDetailJobId(job.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
                        onClick={() => void handleRetry(job.id)}
                        disabled={job.status !== "FAILED"}
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
                        onClick={() => void handleCancel(job.id)}
                        disabled={job.status === "COMPLETED"}
                      >
                        Cancel
                      </button>
                      <Link
                        href={projectHrefForJob(job.type)}
                        className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailJobId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-illuvrse-border bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Job Details</p>
                <h3 className="text-lg font-semibold">
                  {detailJob?.projectTitle ?? "Loading"} · {detailJob?.type ?? ""}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                onClick={() => {
                  setDetailJobId(null);
                  setDetail(null);
                }}
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-4 text-sm text-illuvrse-muted">Loading details...</p>
            ) : detail ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-illuvrse-border p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Status</p>
                    <p className="text-sm font-semibold">{detail.job.status}</p>
                  </div>
                  <div className="rounded-2xl border border-illuvrse-border p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Created</p>
                    <p className="text-sm font-semibold">
                      {new Date(detail.job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-illuvrse-border p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Updated</p>
                    <p className="text-sm font-semibold">
                      {new Date(detail.job.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Error</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-illuvrse-bg p-3 text-xs">
                    {detail.job.error ?? "No error captured."}
                  </pre>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Input JSON</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-illuvrse-bg p-3 text-xs">
                    {JSON.stringify(detail.job.inputJson ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Output JSON</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-illuvrse-bg p-3 text-xs">
                    {JSON.stringify(detail.job.outputJson ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Assets</p>
                  {detail.assets.length === 0 ? (
                    <p className="mt-2 text-sm text-illuvrse-muted">No assets attached.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {detail.assets.map((asset) => (
                        <div key={asset.id} className="rounded-2xl border border-illuvrse-border p-3">
                          <p className="text-sm font-semibold">{asset.kind}</p>
                          <a
                            href={asset.url}
                            className="mt-1 block text-xs text-illuvrse-primary"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {asset.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-illuvrse-muted">Unable to load job details.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
