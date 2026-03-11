"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type Channel = {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  heroUrl?: string | null;
  streamUrl?: string | null;
  isActive: boolean;
  isVirtual: boolean;
  scheduleLocked: boolean;
  defaultProgramDurationMin?: number | null;
  lastCheckedAt?: string | null;
  lastHealthyAt?: string | null;
  lastError?: string | null;
};

type Program = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  episodeId?: string | null;
  order?: number | null;
};

type ProgramForm = {
  id?: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  episodeId: string;
};

const emptyProgram: ProgramForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  episodeId: ""
};

function toLocalValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(localValue: string) {
  return new Date(localValue).toISOString();
}

export default function ChannelManager({ channelId }: { channelId: string }) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgram);
  const [episodes, setEpisodes] = useState<Array<{ id: string; title: string }>>([]);

  const load = async () => {
    const [channelPayload, programsPayload, episodesPayload] = await Promise.all([
      fetch(`/api/admin/live/channels/${channelId}`).then((res) => res.json()),
      fetch(`/api/admin/live/channels/${channelId}/programs`).then((res) => res.json()),
      fetch("/api/admin/episodes").then((res) => res.json())
    ]);
    setChannel(channelPayload);
    setPrograms(programsPayload.data ?? []);
    setEpisodes((episodesPayload.data ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [channelId]);

  if (loading || !channel) {
    return <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>;
  }

  const runAction = async (action: "generate24h" | "generate7d" | "clear" | "lock" | "unlock") => {
    await fetch(`/api/admin/live/channels/${channelId}/schedule/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    await load();
  };

  const saveChannel = async () => {
    setSaving(true);
    await fetch(`/api/admin/live/channels/${channelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channel)
    });
    setSaving(false);
    await load();
  };

  const runHealthCheck = async () => {
    await fetch(`/api/admin/live/channels/${channelId}/health`, { method: "POST" });
    await load();
  };

  const saveProgram = async () => {
    const payload = {
      title: programForm.title,
      description: programForm.description || null,
      startsAt: toIso(programForm.startsAt),
      endsAt: toIso(programForm.endsAt),
      episodeId: programForm.episodeId || null,
      streamUrl: null,
      order: null
    };
    const url = programForm.id
      ? `/api/admin/live/programs/${programForm.id}`
      : `/api/admin/live/channels/${channelId}/programs`;
    const method = programForm.id ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setProgramForm(emptyProgram);
    await load();
  };

  const columns: DataColumn<Program>[] = [
    { key: "title", header: "Title", render: (row) => row.title },
    {
      key: "window",
      header: "Window",
      render: (row) => `${new Date(row.startsAt).toLocaleString()} -> ${new Date(row.endsAt).toLocaleString()}`
    },
    { key: "episodeId", header: "Episode", render: (row) => row.episodeId ?? "-" },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setProgramForm({
                id: row.id,
                title: row.title,
                description: row.description ?? "",
                startsAt: toLocalValue(row.startsAt),
                endsAt: toLocalValue(row.endsAt),
                episodeId: row.episodeId ?? ""
              })
            }
            className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch(`/api/admin/live/programs/${row.id}`, { method: "DELETE" });
              await load();
            }}
            className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{channel.name}</h2>
          <p className="text-sm text-illuvrse-muted">Manage channel settings, health, and EPG programs.</p>
        </div>
        <Link href="/admin/live/channels" className="text-sm text-illuvrse-primary">
          Back to channels
        </Link>
      </div>

      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
        <h3 className="font-semibold">Channel Settings</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={channel.name} onChange={(e) => setChannel({ ...channel, name: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <input value={channel.slug} onChange={(e) => setChannel({ ...channel, slug: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <input value={channel.category ?? ""} onChange={(e) => setChannel({ ...channel, category: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" placeholder="Category" />
          <input value={channel.logoUrl ?? ""} onChange={(e) => setChannel({ ...channel, logoUrl: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" placeholder="Logo URL" />
          <input value={channel.heroUrl ?? ""} onChange={(e) => setChannel({ ...channel, heroUrl: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" placeholder="Hero URL" />
          <input value={channel.streamUrl ?? ""} onChange={(e) => setChannel({ ...channel, streamUrl: e.target.value })} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" placeholder="Stream URL (nullable for virtual)" />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={channel.isActive} onChange={(e) => setChannel({ ...channel, isActive: e.target.checked })} /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={channel.isVirtual} onChange={(e) => setChannel({ ...channel, isVirtual: e.target.checked })} /> Virtual</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={channel.scheduleLocked} onChange={(e) => setChannel({ ...channel, scheduleLocked: e.target.checked })} /> Schedule Locked</label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveChannel} disabled={saving} className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white">
            {saving ? "Saving..." : "Save Channel"}
          </button>
          <button type="button" onClick={runHealthCheck} className="rounded-xl border border-illuvrse-border px-4 py-2 text-sm">
            Run Health Check
          </button>
          <p className="text-xs text-illuvrse-muted">
            Last checked: {channel.lastCheckedAt ? new Date(channel.lastCheckedAt).toLocaleString() : "Never"} | Last success: {channel.lastHealthyAt ? new Date(channel.lastHealthyAt).toLocaleString() : "Never"} | Last error: {channel.lastError ?? "None"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
        <h3 className="font-semibold">EPG Bulk Tools</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => runAction("generate24h")} className="rounded-lg border border-illuvrse-border px-3 py-2 text-xs">Generate next 24h</button>
          <button type="button" onClick={() => runAction("generate7d")} className="rounded-lg border border-illuvrse-border px-3 py-2 text-xs">Regenerate next 7 days</button>
          <button type="button" onClick={() => runAction("clear")} className="rounded-lg border border-illuvrse-border px-3 py-2 text-xs text-illuvrse-danger">Clear schedule</button>
          <button type="button" onClick={() => runAction("lock")} className="rounded-lg border border-illuvrse-border px-3 py-2 text-xs">Lock schedule</button>
          <button type="button" onClick={() => runAction("unlock")} className="rounded-lg border border-illuvrse-border px-3 py-2 text-xs">Unlock schedule</button>
        </div>
      </div>

      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
        <h3 className="font-semibold">{programForm.id ? "Edit Program" : "Create Program"}</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <input value={programForm.title} onChange={(e) => setProgramForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Program title" className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <input type="datetime-local" value={programForm.startsAt} onChange={(e) => setProgramForm((prev) => ({ ...prev, startsAt: e.target.value }))} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <input type="datetime-local" value={programForm.endsAt} onChange={(e) => setProgramForm((prev) => ({ ...prev, endsAt: e.target.value }))} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <select value={programForm.episodeId} onChange={(e) => setProgramForm((prev) => ({ ...prev, episodeId: e.target.value }))} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm">
            <option value="">No episode</option>
            {episodes.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
          <button type="button" onClick={saveProgram} className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white">
            {programForm.id ? "Update Program" : "Create Program"}
          </button>
        </div>
      </div>

      <DataTable columns={columns} rows={programs} emptyMessage="No programs scheduled." />
    </div>
  );
}
