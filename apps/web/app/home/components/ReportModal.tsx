"use client";

import { useState } from "react";

const reasons = ["Spam", "Harassment", "Nudity", "Violence", "Other"];

export default function ReportModal({ postId, open, onClose }: { postId: string | null; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");

  if (!open || !postId) return null;

  async function submit() {
    await fetch(`/api/feed/${postId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details })
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold">Report Post</h3>
        <select
          className="w-full rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasons.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <textarea
          className="w-full rounded-xl border border-illuvrse-border p-2 text-sm"
          rows={3}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Add details"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
