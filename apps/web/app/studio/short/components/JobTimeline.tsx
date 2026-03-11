/**
 * Job timeline display for short generation.
 * Request/response: renders job status and output preview.
 * Guard: client component.
 */
"use client";

import type { AgentJob } from "@/lib/studioApi";

export default function JobTimeline({ jobs }: { jobs: AgentJob[] }) {
  if (jobs.length === 0) {
    return <div className="party-card">No jobs yet.</div>;
  }

  return (
    <div className="party-card space-y-3">
      <h3 className="text-lg font-semibold">Job Timeline</h3>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-illuvrse-border p-3">
            <p className="text-sm font-semibold">{job.type}</p>
            <p className="text-xs text-illuvrse-muted">Status: {job.status}</p>
            {job.error ? <p className="text-xs text-red-500">Error: {job.error}</p> : null}
            {job.outputJson ? (
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-illuvrse-bg p-2 text-xs">
                {JSON.stringify(job.outputJson, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
