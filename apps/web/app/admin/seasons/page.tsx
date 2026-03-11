/**
 * Seasons management page.
 * Data: GET /api/admin/seasons, GET /api/admin/shows?all=1.
 * Actions: POST /api/admin/seasons -> { id }.
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useState } from "react";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";
import SeasonForm, { type SeasonFormValues } from "@/components/admin/SeasonForm";

type SeasonRecord = {
  id: string;
  title: string;
  number: number;
  showTitle: string;
};

type ShowOption = { id: string; title: string };

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/seasons").then((res) => res.json()),
      fetch("/api/admin/shows?all=1").then((res) => res.json())
    ]).then(([seasonPayload, showPayload]) => {
      setSeasons(seasonPayload.data ?? []);
      setShows(showPayload.data ?? []);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (values: SeasonFormValues) => {
    const res = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(payload.error ?? "Failed to create season.");
    }

    const updated = await fetch("/api/admin/seasons").then((res) => res.json());
    setSeasons(updated.data ?? []);
  };

  const columns: DataColumn<SeasonRecord>[] = [
    { key: "show", header: "Show", render: (row) => row.showTitle },
    { key: "number", header: "Number", render: (row) => row.number },
    { key: "title", header: "Title", render: (row) => row.title }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Create Season</h2>
        <p className="text-sm text-illuvrse-muted">Attach seasons to a show.</p>
        <div className="mt-4">
          <SeasonForm shows={shows} onSubmit={handleSubmit} />
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={seasons} emptyMessage="No seasons yet." />
      )}
    </div>
  );
}
