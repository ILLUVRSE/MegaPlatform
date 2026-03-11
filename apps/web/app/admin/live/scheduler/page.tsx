"use client";

import { useEffect, useState } from "react";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type RunRecord = {
  id: string;
  startedAt: string;
  completedAt?: string | null;
  status: string;
  programsCreated: number;
  channelsTouched: number;
  errors: number;
  summary?: string | null;
};

export default function AdminLiveSchedulerPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [window, setWindow] = useState<"24h" | "7d">("24h");

  const load = async () => {
    const payload = await fetch("/api/admin/live/scheduler/runs").then((res) => res.json());
    setRuns(payload.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const runNow = async () => {
    setRunning(true);
    await fetch("/api/admin/live/scheduler/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ window })
    });
    setRunning(false);
    await load();
  };

  const last = runs[0];
  const columns: DataColumn<RunRecord>[] = [
    { key: "startedAt", header: "Started", render: (row) => new Date(row.startedAt).toLocaleString() },
    { key: "completedAt", header: "Completed", render: (row) => (row.completedAt ? new Date(row.completedAt).toLocaleString() : "-") },
    { key: "status", header: "Status", render: (row) => row.status },
    { key: "programsCreated", header: "Programs", render: (row) => `${row.programsCreated}` },
    { key: "channelsTouched", header: "Channels", render: (row) => `${row.channelsTouched}` },
    { key: "errors", header: "Errors", render: (row) => `${row.errors}` },
    { key: "summary", header: "Summary", render: (row) => row.summary ?? "-" }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
        <h2 className="text-xl font-semibold">Scheduler Controls</h2>
        <p className="text-sm text-illuvrse-muted">Trigger scheduler runs and review recent results.</p>
        <div className="flex items-center gap-3">
          <select
            value={window}
            onChange={(event) => setWindow(event.target.value as "24h" | "7d")}
            className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          >
            <option value="24h">Generate next 24h</option>
            <option value="7d">Regenerate next 7d</option>
          </select>
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {running ? "Running..." : "Run Scheduler Now"}
          </button>
        </div>
        <p className="text-xs text-illuvrse-muted">
          Last run: {last ? `${new Date(last.startedAt).toLocaleString()} (${last.status})` : "Never"}
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={runs} emptyMessage="No scheduler runs yet." />
      )}
    </div>
  );
}
