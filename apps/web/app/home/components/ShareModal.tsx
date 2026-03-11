"use client";

import { useState } from "react";

export default function ShareModal({ postId, open, onClose }: { postId: string | null; open: boolean; onClose: () => void }) {
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);

  if (!open || !postId) return null;

  async function submit() {
    setPending(true);
    await fetch(`/api/feed/${postId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption })
    });
    setPending(false);
    setCaption("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold">Share Post</h3>
        <textarea
          className="w-full rounded-xl border border-illuvrse-border p-2 text-sm"
          rows={3}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Add your caption"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-illuvrse-border px-4 py-2 text-xs font-semibold uppercase tracking-widest">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
          >
            {pending ? "Sharing..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
