"use client";

import { useEffect, useState } from "react";

type AdminFeedPost = {
  id: string;
  type: string;
  authorProfile: string | null;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isHidden: boolean;
  isShadowbanned: boolean;
  isPinned: boolean;
  isFeatured: boolean;
};

export default function AdminFeedPostsPage() {
  const [posts, setPosts] = useState<AdminFeedPost[]>([]);
  const [typeFilter, setTypeFilter] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    const payload = await fetch(`/api/admin/feed/posts?${params.toString()}`).then((res) => res.json());
    setPosts(payload.data ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function action(id: string, name: string, body?: Record<string, unknown>) {
    await fetch(`/api/admin/feed/${id}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Home Feed Posts</h2>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="SHORT">SHORT</option>
          <option value="MEME">MEME</option>
          <option value="WATCH_EPISODE">WATCH_EPISODE</option>
          <option value="WATCH_SHOW">WATCH_SHOW</option>
          <option value="LIVE_CHANNEL">LIVE_CHANNEL</option>
          <option value="GAME">GAME</option>
          <option value="LINK">LINK</option>
          <option value="TEXT">TEXT</option>
          <option value="SHARE">SHARE</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-illuvrse-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-illuvrse-border bg-illuvrse-bg">
            <tr>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Author</th>
              <th className="px-3 py-2 text-left">Caption</th>
              <th className="px-3 py-2 text-left">Counts</th>
              <th className="px-3 py-2 text-left">Flags</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-illuvrse-border align-top">
                <td className="px-3 py-2">{new Date(post.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{post.type}</td>
                <td className="px-3 py-2">{post.authorProfile ?? "Anonymous"}</td>
                <td className="max-w-[280px] px-3 py-2">{post.caption?.slice(0, 100) ?? "-"}</td>
                <td className="px-3 py-2">{post.likeCount}/{post.commentCount}/{post.shareCount}</td>
                <td className="px-3 py-2 text-xs">
                  {post.isHidden ? "hidden " : ""}
                  {post.isShadowbanned ? "shadow " : ""}
                  {post.isPinned ? "pinned " : ""}
                  {post.isFeatured ? "featured" : ""}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button className="rounded border border-illuvrse-border px-2 py-1" onClick={() => void action(post.id, post.isHidden ? "unhide" : "hide")}>{post.isHidden ? "Unhide" : "Hide"}</button>
                    <button className="rounded border border-illuvrse-border px-2 py-1" onClick={() => void action(post.id, "shadowban", { shadowbanned: !post.isShadowbanned })}>{post.isShadowbanned ? "Unshadow" : "Shadow"}</button>
                    <button className="rounded border border-illuvrse-border px-2 py-1" onClick={() => void action(post.id, "pin", { pinned: !post.isPinned })}>{post.isPinned ? "Unpin" : "Pin"}</button>
                    <button className="rounded border border-illuvrse-border px-2 py-1" onClick={() => void action(post.id, "feature", { featured: !post.isFeatured })}>{post.isFeatured ? "Unfeature" : "Feature"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
