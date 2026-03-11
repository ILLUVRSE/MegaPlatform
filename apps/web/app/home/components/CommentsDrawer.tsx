"use client";

import { useEffect, useState } from "react";

type CommentItem = {
  id: string;
  body: string;
  userId: string | null;
  anonId: string | null;
  createdAt: string;
};

export default function CommentsDrawer({
  postId,
  open,
  onClose
}: {
  postId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open || !postId) return;
    void fetch(`/api/feed/${postId}/comments`)
      .then((res) => res.json())
      .then((payload) => setComments(payload.items ?? []));
  }, [open, postId]);

  async function submit() {
    if (!postId || !body.trim()) return;
    const res = await fetch(`/api/feed/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    if (!res.ok) return;
    const payload = await res.json();
    setComments((current) => [payload.item, ...current]);
    setBody("");
  }

  if (!open || !postId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button type="button" onClick={onClose} className="text-sm text-illuvrse-muted">
            Close
          </button>
        </div>
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-illuvrse-border p-3 text-sm">
              <p>{comment.body}</p>
              <p className="mt-1 text-xs text-illuvrse-muted">{new Date(comment.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea
            className="w-full rounded-xl border border-illuvrse-border p-2 text-sm"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a comment"
          />
          <button
            type="button"
            className="rounded-full bg-illuvrse-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
            onClick={submit}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
