"use client";

import { useMemo, useState } from "react";

type QueueTask = {
  id: string;
  title: string;
  agent: string;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
  context: string;
  acceptance_criteria: string[];
  steps_log: string[];
  artifacts: string[];
  risk_level: string;
  rollback_notes: string;
};

type Props = {
  tasks: QueueTask[];
};

const STATUS_ORDER = ["pending", "in_progress", "blocked", "done"];

export default function OpsTaskBoard({ tasks }: Props) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id ?? null);

  const agents = useMemo(() => {
    return Array.from(new Set(tasks.map((task) => task.agent))).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const statusOk = statusFilter === "all" || task.status === statusFilter;
      const agentOk = agentFilter === "all" || task.agent === agentFilter;
      return statusOk && agentOk;
    });
  }, [agentFilter, statusFilter, tasks]);

  const selected = filtered.find((task) => task.id === selectedId) ?? filtered[0] ?? null;

  return (
    <section className="party-card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">All-Day Operator</p>
        <h2 className="text-2xl font-semibold">Task Queue</h2>
        <p className="text-sm text-illuvrse-muted">
          RBAC hardening is still TODO for this surface. Current view is read-only.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
          >
            <option value="all">All</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Agent
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border border-illuvrse-border bg-white px-4 py-2"
          >
            <option value="all">All</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-x-auto rounded-2xl border border-illuvrse-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Title</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-illuvrse-muted">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filtered.map((task) => (
                  <tr
                    key={task.id}
                    data-testid={`task-row-${task.id}`}
                    className={`cursor-pointer border-t border-illuvrse-border ${
                      selected?.id === task.id ? "bg-slate-50" : ""
                    }`}
                    onClick={() => setSelectedId(task.id)}
                  >
                    <td className="px-3 py-2">{task.status}</td>
                    <td className="px-3 py-2">P{task.priority}</td>
                    <td className="px-3 py-2">{task.agent}</td>
                    <td className="px-3 py-2">{task.title}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-illuvrse-border bg-white p-4" data-testid="task-details">
          {selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Task</p>
                <h3 className="text-lg font-semibold">{selected.title}</h3>
                <p className="text-illuvrse-muted">{selected.id}</p>
              </div>

              <p>
                <span className="font-semibold">Agent:</span> {selected.agent}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {selected.status}
              </p>
              <p>
                <span className="font-semibold">Risk:</span> {selected.risk_level}
              </p>
              <p>
                <span className="font-semibold">Created:</span> {new Date(selected.created_at).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Updated:</span> {new Date(selected.updated_at).toLocaleString()}
              </p>

              <div>
                <p className="font-semibold">Context</p>
                <p className="text-illuvrse-muted">{selected.context}</p>
              </div>

              <div>
                <p className="font-semibold">Acceptance Criteria</p>
                <ul className="list-disc space-y-1 pl-5">
                  {selected.acceptance_criteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold">Steps Log</p>
                <ul className="list-disc space-y-1 pl-5">
                  {selected.steps_log.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold">Artifacts</p>
                {selected.artifacts.length === 0 ? (
                  <p className="text-illuvrse-muted">None</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    {selected.artifacts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="font-semibold">Rollback Notes</p>
                <p className="text-illuvrse-muted">{selected.rollback_notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-illuvrse-muted">Select a task to inspect details.</p>
          )}
        </div>
      </div>
    </section>
  );
}
