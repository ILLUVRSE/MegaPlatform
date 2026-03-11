"use client";

import { useMemo, useState } from "react";
import type { OpsSections } from "@/lib/ops";

type Props = {
  initialSections: OpsSections;
  initialNotes: string;
  initialDestructiveOk: boolean;
  onRunRole?: (role: string) => void;
};

type SaveStatus = { type: "idle" | "saving" | "success" | "error"; message?: string };

type TaskMap = Record<string, string>;

function normalizeLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function OpsCommandCenter({
  initialSections,
  initialNotes,
  initialDestructiveOk,
  onRunRole
}: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [destructiveOk, setDestructiveOk] = useState(initialDestructiveOk);
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  const [taskInputs, setTaskInputs] = useState<TaskMap>(() => {
    const map: TaskMap = {};
    for (const [role, tasks] of Object.entries(initialSections)) {
      map[role] = tasks.join("\n");
    }
    return map;
  });

  const sections = useMemo<OpsSections>(() => {
    const built: Record<string, string[]> = {};
    for (const [role, value] of Object.entries(taskInputs)) {
      built[role] = normalizeLines(value);
    }
    return built as OpsSections;
  }, [taskInputs]);

  const saveBriefing = async (alsoEnqueue: boolean) => {
    setStatus({ type: "saving" });
    try {
      const res = await fetch(`/api/admin/ops/${alsoEnqueue ? "enqueue" : "briefing"}` , {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, notes, destructiveOk })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error ?? "Failed to save");
      }
      const payload = await res.json();
      if (alsoEnqueue) {
        const result = payload?.result;
        setStatus({
          type: "success",
          message: `Enqueued ${result?.enqueued ?? 0}, blocked ${result?.blocked ?? 0}.`
        });
      } else {
        setStatus({ type: "success", message: "Saved briefing." });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setStatus({ type: "error", message });
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Command Center</h3>
            <p className="text-sm text-illuvrse-muted">
              Assign local queued tasks by role. Use one task per line. Add [DESTRUCTIVE] in a task when needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveBriefing(false)}
              className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            >
              Save Briefing
            </button>
            <button
              type="button"
              onClick={() => saveBriefing(true)}
              className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
            >
              Save + Enqueue
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-illuvrse-muted">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={destructiveOk}
              onChange={(event) => setDestructiveOk(event.target.checked)}
            />
            Approve destructive tasks
          </label>
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
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(taskInputs).map(([role, value]) => (
          <div key={role} className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">{role}</p>
              {onRunRole ? (
                <button
                  type="button"
                  onClick={() => onRunRole(role)}
                  className="rounded-full border border-illuvrse-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                >
                  Run Agent
                </button>
              ) : null}
            </div>
            <textarea
              value={value}
              onChange={(event) =>
                setTaskInputs((prev) => ({
                  ...prev,
                  [role]: event.target.value
                }))
              }
              rows={6}
              placeholder="Add one task per line"
              className="mt-3 w-full rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
            />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-illuvrse-border bg-white p-4 shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Notes</p>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Optional notes for the team"
          className="mt-3 w-full rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
        />
      </section>
    </div>
  );
}
