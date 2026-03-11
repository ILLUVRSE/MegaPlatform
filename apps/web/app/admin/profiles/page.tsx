"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type ProfileSummary = {
  id: string;
  name: string;
  isKids: boolean;
  user: { id: string; email: string; name?: string | null };
  _count: { listItems: number; progress: number };
};

type ProfileDetail = {
  profile: {
    id: string;
    name: string;
    isKids: boolean;
    avatarUrl?: string | null;
    user: { id: string; email: string; name?: string | null };
  };
  myList: Array<{
    id: string;
    mediaType: string;
    showId?: string | null;
    show?: { id: string; title: string; slug: string } | null;
    createdAt: string;
  }>;
  progress: Array<{
    id: string;
    episodeId: string;
    positionSec: number;
    durationSec: number;
    updatedAt: string;
    episode: {
      id: string;
      title: string;
      seasonNumber: number;
      showId: string;
      showTitle: string;
      showSlug: string;
    };
  }>;
};

export default function AdminProfilesPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ProfileSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    setLoading(true);
    const payload = await fetch(`/api/admin/profiles?q=${encodeURIComponent(query)}`).then((res) => res.json());
    setRows(payload.data ?? []);
    setLoading(false);
  };

  const loadDetail = async (profileId: string) => {
    const payload = await fetch(`/api/admin/profiles/${profileId}`).then((res) => res.json());
    setDetail(payload);
  };

  useEffect(() => {
    loadProfiles().catch(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId).catch(() => setDetail(null));
  }, [selectedId]);

  const toggleKids = async (profile: ProfileSummary) => {
    await fetch(`/api/admin/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isKids: !profile.isKids })
    });
    await loadProfiles();
    if (selectedId === profile.id) await loadDetail(profile.id);
  };

  const deleteProfile = async (profile: ProfileSummary) => {
    await fetch(`/api/admin/profiles/${profile.id}`, { method: "DELETE" });
    if (selectedId === profile.id) {
      setSelectedId(null);
      setDetail(null);
    }
    await loadProfiles();
  };

  const resetProgress = async (
    payload:
      | { scope: "all" }
      | { scope: "episode"; episodeId: string }
      | { scope: "show"; showId: string }
  ) => {
    if (!selectedId) return;
    await fetch(`/api/admin/profiles/${selectedId}/progress/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await loadDetail(selectedId);
  };

  const resetMyList = async (payload: { scope: "all" } | { scope: "show"; showId: string }) => {
    if (!selectedId) return;
    await fetch(`/api/admin/profiles/${selectedId}/my-list/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await loadDetail(selectedId);
  };

  const columns = useMemo<DataColumn<ProfileSummary>[]>(
    () => [
      { key: "name", header: "Profile", render: (row) => row.name },
      {
        key: "user",
        header: "User",
        render: (row) => (
          <p className="text-xs text-illuvrse-muted">
            {row.user.email} {row.user.name ? `(${row.user.name})` : ""}
          </p>
        )
      },
      { key: "kids", header: "Kids", render: (row) => (row.isKids ? "Yes" : "No") },
      { key: "list", header: "My List", render: (row) => `${row._count.listItems}` },
      { key: "progress", header: "Progress", render: (row) => `${row._count.progress}` },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedId(row.id)}
              className="rounded border border-illuvrse-border px-2 py-1 text-xs"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => toggleKids(row)}
              className="rounded border border-illuvrse-border px-2 py-1 text-xs"
            >
              Toggle Kids
            </button>
            <button
              type="button"
              onClick={() => deleteProfile(row)}
              className="rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
            >
              Delete
            </button>
          </div>
        )
      }
    ],
    [rows, selectedId]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Profile Support Tools</h2>
        <p className="text-sm text-illuvrse-muted">Moderate profiles and manage My List/Continue Watching support requests.</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by profile name or user email"
          className="mt-4 w-full rounded-xl border border-illuvrse-border px-4 py-2 md:max-w-lg"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={rows} emptyMessage="No profiles found." />
      )}

      {detail ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">My List</h3>
              <button
                type="button"
                onClick={() => resetMyList({ scope: "all" })}
                className="rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
              >
                Clear All
              </button>
            </div>
            {detail.myList.length === 0 ? (
              <p className="text-sm text-illuvrse-muted">No saved items.</p>
            ) : (
              detail.myList.map((item) => (
                <div key={item.id} className="rounded-xl border border-illuvrse-border p-3 text-sm">
                  <p className="font-semibold">{item.show?.title ?? item.showId ?? "Unknown show"}</p>
                  <p className="text-xs text-illuvrse-muted">{item.mediaType}</p>
                  {item.showId ? (
                    <button
                      type="button"
                      onClick={() => resetMyList({ scope: "show", showId: item.showId! })}
                      className="mt-2 rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
                    >
                      Remove Show
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Watch Progress</h3>
              <button
                type="button"
                onClick={() => resetProgress({ scope: "all" })}
                className="rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
              >
                Reset All
              </button>
            </div>
            {detail.progress.length === 0 ? (
              <p className="text-sm text-illuvrse-muted">No progress entries.</p>
            ) : (
              detail.progress.map((item) => (
                <div key={item.id} className="rounded-xl border border-illuvrse-border p-3 text-sm space-y-2">
                  <p className="font-semibold">
                    {item.episode.showTitle} - {item.episode.title}
                  </p>
                  <p className="text-xs text-illuvrse-muted">
                    {item.positionSec}s / {item.durationSec}s
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => resetProgress({ scope: "episode", episodeId: item.episodeId })}
                      className="rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
                    >
                      Reset Episode
                    </button>
                    <button
                      type="button"
                      onClick={() => resetProgress({ scope: "show", showId: item.episode.showId })}
                      className="rounded border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
                    >
                      Reset Show
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
