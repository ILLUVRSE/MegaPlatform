"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  resolvedAt: string | null;
  post: { id: string; type: string; caption: string | null };
};

export default function AdminFeedReportsPage() {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [reports, setReports] = useState<ReportRow[]>([]);

  async function load() {
    const payload = await fetch(`/api/admin/feed/reports?status=${status}`).then((res) => res.json());
    setReports(payload.data ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function resolve(reportId: string) {
    await fetch(`/api/admin/feed/reports/${reportId}/resolve`, { method: "POST" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Home Feed Reports</h2>
        <select value={status} onChange={(event) => setStatus(event.target.value as "open" | "resolved")} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <div className="grid gap-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-2xl border border-illuvrse-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{report.reason}</p>
              <p className="text-xs text-illuvrse-muted">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-2 text-sm text-illuvrse-muted">{report.details || "No details"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Post {report.post.type} - {report.post.caption ?? "(no caption)"}</p>
            {status === "open" ? (
              <button type="button" className="mt-3 rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest" onClick={() => void resolve(report.id)}>
                Resolve
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
