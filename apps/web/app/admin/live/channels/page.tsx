"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type ChannelRecord = {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  isActive: boolean;
  isVirtual: boolean;
  scheduleLocked: boolean;
  streamUrl?: string | null;
  _count?: { programs: number };
};

type ChannelFormState = {
  name: string;
  slug: string;
  category: string;
  streamUrl: string;
  isVirtual: boolean;
};

const DEFAULT_FORM: ChannelFormState = {
  name: "",
  slug: "",
  category: "",
  streamUrl: "",
  isVirtual: false
};

export default function AdminLiveChannelsPage() {
  const [channels, setChannels] = useState<ChannelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ChannelFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const payload = await fetch("/api/admin/live/channels").then((res) => res.json());
    setChannels(payload.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const submit = async () => {
    setError(null);
    const response = await fetch("/api/admin/live/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        description: null,
        logoUrl: null,
        heroUrl: null,
        isActive: true,
        defaultProgramDurationMin: 30
      })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Failed to create channel");
      return;
    }
    setForm(DEFAULT_FORM);
    await load();
  };

  const columns: DataColumn<ChannelRecord>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "slug", header: "Slug", render: (row) => row.slug },
    { key: "category", header: "Category", render: (row) => row.category ?? "-" },
    { key: "type", header: "Type", render: (row) => (row.isVirtual ? "Virtual" : "Live") },
    { key: "programs", header: "Programs", render: (row) => `${row._count?.programs ?? 0}` },
    { key: "lock", header: "Schedule Lock", render: (row) => (row.scheduleLocked ? "Locked" : "Open") },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link href={`/admin/live/channels/${row.id}`} className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs">
          Manage
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Live Channels</h2>
        <p className="text-sm text-illuvrse-muted">Create and manage live and virtual channels.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          />
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug"
            className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Category"
            className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          />
          <input
            value={form.streamUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, streamUrl: event.target.value }))}
            placeholder="Stream URL (optional)"
            className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-xl border border-illuvrse-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.isVirtual}
              onChange={(event) => setForm((prev) => ({ ...prev, isVirtual: event.target.checked }))}
            />
            Virtual
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Create Channel
          </button>
          <Link href="/admin/live/scheduler" className="text-sm text-illuvrse-primary">
            Open Scheduler Controls
          </Link>
          {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={channels} emptyMessage="No channels yet." />
      )}
    </div>
  );
}
