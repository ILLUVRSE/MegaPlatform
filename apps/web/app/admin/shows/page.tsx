/**
 * Shows list page.
 * Data: GET /api/admin/shows -> { data, page, totalPages }.
 * Actions: DELETE /api/admin/shows/[id].
 * Guard: middleware + requireAdmin on API routes.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type ShowRecord = {
  id: string;
  title: string;
  slug: string;
  isPremium?: boolean;
  price?: number | null;
  createdAt: string;
};

type ShowsResponse = {
  data: ShowRecord[];
  page: number;
  totalPages: number;
};

export default function ShowsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ShowsResponse>({ data: [], page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const query = searchParams.get("q") ?? "";
  const page = searchParams.get("page") ?? "1";

  const loadShows = () => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/admin/shows?q=${encodeURIComponent(query)}&page=${page}`, {
      signal: controller.signal
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load shows (${res.status})`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  };

  useEffect(() => {
    return loadShows();
  }, [query, page, refreshTick]);

  const columns = useMemo<DataColumn<ShowRecord>[]>(
    () => [
      { key: "title", header: "Title", render: (row) => row.title },
      { key: "slug", header: "Slug", render: (row) => row.slug },
      {
        key: "createdAt",
        header: "Created",
        render: (row) => new Date(row.createdAt).toLocaleDateString()
      },
      {
        key: "monetization",
        header: "Monetization",
        render: (row) =>
          row.isPremium ? `$${((row.price ?? 0) / 100).toFixed(2)}` : "Free"
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-2">
            <Link
              href={`/admin/shows/${row.id}/edit`}
              className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/admin/shows/${row.id}`, { method: "DELETE" });
                setRefreshTick((value) => value + 1);
              }}
              className="rounded-lg border border-illuvrse-border px-2 py-1 text-xs text-illuvrse-danger"
            >
              Delete
            </button>
          </div>
        )
      }
    ],
    [router]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Shows</h2>
          <p className="text-sm text-illuvrse-muted">Manage show metadata and brand assets.</p>
        </div>
        <Link
          href="/admin/shows/new"
          className="rounded-xl bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white"
        >
          New Show
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(event) =>
            router.replace(`/admin/shows?q=${encodeURIComponent(event.target.value)}&page=1`)
          }
          placeholder="Search shows"
          className="w-full rounded-xl border border-illuvrse-border px-4 py-2 md:max-w-xs"
        />
        <span className="text-xs text-illuvrse-muted">Page {data.page} of {data.totalPages}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => router.replace(`/admin/shows?q=${encodeURIComponent(query)}&page=${data.page - 1}`)}
            className="rounded-lg border border-illuvrse-border px-3 py-1 text-xs"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => router.replace(`/admin/shows?q=${encodeURIComponent(query)}&page=${data.page + 1}`)}
            className="rounded-lg border border-illuvrse-border px-3 py-1 text-xs"
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <DataTable columns={columns} rows={data.data} emptyMessage="No shows found." />
      )}
    </div>
  );
}
