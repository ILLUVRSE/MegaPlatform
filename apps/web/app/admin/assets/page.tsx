"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type AssetRecord = {
  id: string;
  kind: string;
  url: string;
  storageKey?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  temporary: boolean;
  isSafe: boolean;
  isFlagged: boolean;
  isQuarantined: boolean;
  createdAt: string;
  project: { id: string; title: string; type: string; status: string };
  references: {
    show: Array<{ id: string; title: string; field: string }>;
    episode: Array<{ id: string; title: string; field: string }>;
  };
};

const kinds = [
  "",
  "SHORT_MP4",
  "MEME_PNG",
  "IMAGE_UPLOAD",
  "AUDIO_UPLOAD",
  "VIDEO_UPLOAD",
  "THUMBNAIL",
  "TEXT",
  "HLS_MANIFEST"
];

export default function AdminAssetsPage() {
  const [rows, setRows] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [quarantinedOnly, setQuarantinedOnly] = useState(false);
  const [temporaryOnly, setTemporaryOnly] = useState(false);
  const [days, setDays] = useState(14);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (query) params.set("q", query);
    if (flaggedOnly) params.set("flagged", "1");
    if (quarantinedOnly) params.set("quarantined", "1");
    if (temporaryOnly) params.set("temporary", "1");
    const payload = await fetch(`/api/admin/assets?${params.toString()}`).then((res) => res.json());
    setRows(payload.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [kind, query, flaggedOnly, quarantinedOnly, temporaryOnly]);

  const moderate = async (
    id: string,
    patch: Partial<Pick<AssetRecord, "isSafe" | "isFlagged" | "isQuarantined" | "temporary">>
  ) => {
    await fetch(`/api/admin/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await load();
  };

  const runCleanup = async (dryRun: boolean) => {
    const response = await fetch("/api/admin/assets/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, dryRun })
    });
    const payload = await response.json();
    if (dryRun) {
      setCleanupResult(`Dry run: ${payload.count ?? 0} asset(s) match cleanup.`);
    } else {
      setCleanupResult(`Deleted: ${payload.deleted ?? 0} temporary asset(s).`);
      await load();
    }
  };

  const columns = useMemo<DataColumn<AssetRecord>[]>(
    () => [
      { key: "kind", header: "Kind", render: (row) => row.kind },
      {
        key: "url",
        header: "Asset",
        render: (row) => (
          <div className="space-y-1">
            <a href={row.url} target="_blank" rel="noreferrer" className="text-xs text-illuvrse-primary">
              {row.url.length > 56 ? `${row.url.slice(0, 56)}...` : row.url}
            </a>
            <p className="text-[10px] text-illuvrse-muted">
              key: {row.storageKey ?? "-"} | type: {row.contentType ?? "-"} | size: {row.sizeBytes ?? "-"}
            </p>
          </div>
        )
      },
      {
        key: "refs",
        header: "References",
        render: (row) => {
          const showCount = row.references.show.length;
          const episodeCount = row.references.episode.length;
          return (
            <p className="text-xs text-illuvrse-muted">
              show: {showCount} | episode: {episodeCount}
            </p>
          );
        }
      },
      {
        key: "project",
        header: "Project",
        render: (row) => (
          <p className="text-xs text-illuvrse-muted">
            {row.project.title} ({row.project.type})
          </p>
        )
      },
      {
        key: "flags",
        header: "Flags",
        render: (row) => (
          <p className="text-xs text-illuvrse-muted">
            temp:{row.temporary ? "yes" : "no"} safe:{row.isSafe ? "yes" : "no"} flagged:{row.isFlagged ? "yes" : "no"} quarantine:{row.isQuarantined ? "yes" : "no"}
          </p>
        )
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => moderate(row.id, { isSafe: true, isFlagged: false })} className="rounded border border-illuvrse-border px-2 py-1 text-[10px]">
              Mark Safe
            </button>
            <button type="button" onClick={() => moderate(row.id, { isFlagged: !row.isFlagged })} className="rounded border border-illuvrse-border px-2 py-1 text-[10px]">
              {row.isFlagged ? "Unflag" : "Flag"}
            </button>
            <button type="button" onClick={() => moderate(row.id, { isQuarantined: !row.isQuarantined })} className="rounded border border-illuvrse-border px-2 py-1 text-[10px]">
              {row.isQuarantined ? "Unquarantine" : "Quarantine"}
            </button>
          </div>
        )
      }
    ],
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-4">
        <h2 className="text-xl font-semibold">Asset Browser</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm">
            {kinds.map((item) => (
              <option key={item || "ALL"} value={item}>
                {item || "All kinds"}
              </option>
            ))}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search URL or key" className="rounded-xl border border-illuvrse-border px-3 py-2 text-sm md:col-span-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flaggedOnly} onChange={(event) => setFlaggedOnly(event.target.checked)} /> Flagged only</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={quarantinedOnly} onChange={(event) => setQuarantinedOnly(event.target.checked)} /> Quarantined only</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={temporaryOnly} onChange={(event) => setTemporaryOnly(event.target.checked)} /> Temporary only</label>
        </div>
      </div>

      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card space-y-3">
        <h3 className="font-semibold">Cleanup Temporary Assets</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input type="number" min={1} value={days} onChange={(event) => setDays(Number(event.target.value) || 1)} className="w-24 rounded-xl border border-illuvrse-border px-3 py-2 text-sm" />
          <span className="text-sm text-illuvrse-muted">days old</span>
          <button type="button" onClick={() => runCleanup(true)} className="rounded-xl border border-illuvrse-border px-4 py-2 text-sm">
            Dry Run
          </button>
          <button type="button" onClick={() => runCleanup(false)} className="rounded-xl bg-illuvrse-danger px-4 py-2 text-sm font-semibold text-white">
            Delete Matching
          </button>
        </div>
        {cleanupResult ? <p className="text-sm text-illuvrse-muted">{cleanupResult}</p> : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={rows} emptyMessage="No assets found." />
      )}
    </div>
  );
}
