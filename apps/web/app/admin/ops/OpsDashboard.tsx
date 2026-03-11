"use client";

import { useEffect, useMemo, useState } from "react";
import OpsCommandCenter from "./OpsCommandCenter";
import type { OpsLogRow, OpsTaskRow, OpsSections } from "@/lib/ops";

type Props = {
  initialTasks: OpsTaskRow[];
  initialLogs: OpsLogRow[];
  initialSections: OpsSections;
  initialNotes: string;
  initialDestructiveOk: boolean;
};

type Status = { type: "idle" | "loading" | "success" | "error"; message?: string };

const STATUS_OPTIONS = ["pending", "in_progress", "done", "blocked"] as const;

export default function OpsDashboard({
  initialTasks,
  initialLogs,
  initialSections,
  initialNotes,
  initialDestructiveOk
}: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [logs, setLogs] = useState(initialLogs);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setStatus({ type: "loading", message: "Refreshing..." });
      const res = await fetch("/api/admin/ops/state");
      if (!res.ok) throw new Error("Failed to refresh");
      const payload = await res.json();
      setTasks(payload.tasks ?? []);
      setLogs(payload.logs ?? []);
      setGeneratedAt(typeof payload.generatedAt === "string" ? payload.generatedAt : null);
      setStatus({ type: "success", message: "Refreshed." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh";
      setStatus({ type: "error", message });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/admin/ops/tasks/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error ?? "Failed to update");
      }
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update";
      setStatus({ type: "error", message });
    }
  };

  const runRole = async (role: string) => {
    try {
      setStatus({ type: "loading", message: `Running ${role}...` });
      const res = await fetch("/api/admin/ops/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Runner failed");
      await refresh();
      setStatus({ type: "success", message: payload.stdout ? payload.stdout.trim() : "Agent triggered." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Runner failed";
      setStatus({ type: "error", message });
    }
  };

  const counts = useMemo(() => {
    return STATUS_OPTIONS.map((status) => ({
      status,
      count: tasks.filter((task) => task.status === status).length
    }));
  }, [tasks]);

  const riskSummary = useMemo(() => {
    const now = Date.now();
    const stalePending = tasks.filter(
      (task) => task.status === "pending" && now - task.createdAtTs > 2 * 60 * 60 * 1000
    ).length;
    const staleInProgress = tasks.filter(
      (task) => task.status === "in_progress" && now - task.createdAtTs > 6 * 60 * 60 * 1000
    ).length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    return { stalePending, staleInProgress, blocked };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Ops Queue</h2>
          <p className="text-sm text-illuvrse-muted">Local-first task queue, briefing controls, and logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-illuvrse-muted">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            Refresh
          </button>
          {status.type !== "idle" ? (
            <span
              className={
                status.type === "error"
                  ? "text-illuvrse-danger"
                  : status.type === "success"
                    ? "text-illuvrse-success"
                    : "text-illuvrse-muted"
              }
            >
              {status.message ?? "Working..."}
            </span>
          ) : null}
          {generatedAt ? <span>Snapshot {new Date(generatedAt).toLocaleTimeString()}</span> : null}
        </div>
      </div>

      <OpsCommandCenter
        initialSections={initialSections}
        initialNotes={initialNotes}
        initialDestructiveOk={initialDestructiveOk}
        onRunRole={runRole}
      />

      <section className="grid gap-3 md:grid-cols-4">
        {counts.map((item) => (
          <div key={item.status} className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{item.status}</p>
            <p className="mt-2 text-2xl font-semibold">{item.count}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Blocked</p>
          <p className={`mt-2 text-2xl font-semibold ${riskSummary.blocked > 0 ? "text-illuvrse-danger" : ""}`}>
            {riskSummary.blocked}
          </p>
        </div>
        <div className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Stale Pending (&gt;2h)</p>
          <p className={`mt-2 text-2xl font-semibold ${riskSummary.stalePending > 0 ? "text-amber-600" : ""}`}>
            {riskSummary.stalePending}
          </p>
        </div>
        <div className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Stale In-Progress (&gt;6h)</p>
          <p className={`mt-2 text-2xl font-semibold ${riskSummary.staleInProgress > 0 ? "text-amber-600" : ""}`}>
            {riskSummary.staleInProgress}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Queue</h2>
        <div className="overflow-hidden rounded-2xl border border-illuvrse-border bg-white shadow-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-illuvrse-muted">
                    No queued tasks.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-t border-illuvrse-border">
                    <td className="px-4 py-3">{task.status}</td>
                    <td className="px-4 py-3">{task.role}</td>
                    <td className="px-4 py-3">{task.text}</td>
                    <td className="px-4 py-3">{task.createdAt}</td>
                    <td className="px-4 py-3">{task.branch ?? "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(event) => void updateStatus(task.id, event.target.value)}
                        className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Logs</h2>
        <div className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
          {logs.length === 0 ? (
            <p className="text-sm text-illuvrse-muted">No logs yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {logs.map((log) => (
                <div key={log.name} className="rounded-xl border border-illuvrse-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                    <span>{log.name}</span>
                    <span>{log.updatedAt}</span>
                  </div>
                  <p className="mt-2 text-sm text-illuvrse-text">{log.preview}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
