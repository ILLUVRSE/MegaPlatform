/**
 * Episodes management page.
 * Data: GET /api/admin/episodes, GET /api/admin/seasons?all=1.
 * Actions: POST /api/admin/episodes -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";
import EpisodeForm, { type EpisodeFormValues } from "@/components/admin/EpisodeForm";

type EpisodeRecord = {
  id: string;
  title: string;
  showTitle: string;
  seasonTitle: string;
  lengthSeconds: number;
};

type SeasonOption = { id: string; title: string; showTitle: string };

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/episodes").then((res) => res.json()),
      fetch("/api/admin/seasons?all=1").then((res) => res.json())
    ]).then(([episodePayload, seasonPayload]) => {
      setEpisodes(episodePayload.data ?? []);
      setSeasons(seasonPayload.data ?? []);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (values: EpisodeFormValues) => {
    const res = await fetch("/api/admin/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(payload.error ?? "Failed to create episode.");
    }

    const updated = await fetch("/api/admin/episodes").then((res) => res.json());
    setEpisodes(updated.data ?? []);
  };

  const columns: DataColumn<EpisodeRecord>[] = [
    { key: "title", header: "Episode", render: (row) => row.title },
    { key: "show", header: "Show", render: (row) => row.showTitle },
    { key: "season", header: "Season", render: (row) => row.seasonTitle },
    { key: "length", header: "Length", render: (row) => `${row.lengthSeconds}s` },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link
          href={`/admin/episodes/${row.id}/edit`}
          className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs"
        >
          Edit
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Create Episode</h2>
        <p className="text-sm text-illuvrse-muted">Add episodes and upload assets.</p>
        <div className="mt-4">
          <EpisodeForm seasons={seasons} onSubmit={handleSubmit} />
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={episodes} emptyMessage="No episodes yet." />
      )}
    </div>
  );
}
