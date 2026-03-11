"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type DataColumn } from "@/components/admin/DataTable";

type ShortRow = {
  id: string;
  title: string;
  isPremium: boolean;
  price?: number | null;
  _count: { purchases: number };
};

type ShowRow = {
  id: string;
  title: string;
  slug: string;
  isPremium: boolean;
  price?: number | null;
};

type PurchaseRow = {
  id: string;
  shortPostId: string;
  buyerId?: string | null;
  buyerAnonId?: string | null;
  createdAt: string;
  shortPost: { id: string; title: string; isPremium: boolean; price?: number | null };
};

export default function MonetizationPage() {
  const [query, setQuery] = useState("");
  const [shorts, setShorts] = useState<ShortRow[]>([]);
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [shortPayload, showPayload, purchasePayload] = await Promise.all([
      fetch(`/api/admin/monetization/shorts?q=${encodeURIComponent(query)}`).then((res) => res.json()),
      fetch(`/api/admin/monetization/shows?q=${encodeURIComponent(query)}`).then((res) => res.json()),
      fetch("/api/admin/monetization/purchases").then((res) => res.json())
    ]);
    setShorts(shortPayload.data ?? []);
    setShows(showPayload.data ?? []);
    setPurchases(purchasePayload.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [query]);

  const patchShort = async (row: ShortRow, nextPremium: boolean, nextPrice?: number | null) => {
    await fetch(`/api/admin/monetization/shorts/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: nextPremium, price: nextPremium ? nextPrice ?? 199 : null })
    });
    await load();
  };

  const patchShow = async (row: ShowRow, nextPremium: boolean, nextPrice?: number | null) => {
    await fetch(`/api/admin/monetization/shows?id=${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: nextPremium, price: nextPremium ? nextPrice ?? 499 : null })
    });
    await load();
  };

  const shortColumns = useMemo<DataColumn<ShortRow>[]>(
    () => [
      { key: "title", header: "Short", render: (row) => row.title },
      { key: "premium", header: "Premium", render: (row) => (row.isPremium ? "Yes" : "No") },
      { key: "price", header: "Price", render: (row) => (row.price != null ? `$${(row.price / 100).toFixed(2)}` : "-") },
      { key: "purchases", header: "Purchases", render: (row) => `${row._count?.purchases ?? 0}` },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-2">
            <button type="button" onClick={() => patchShort(row, !row.isPremium, row.price)} className="rounded border border-illuvrse-border px-2 py-1 text-xs">
              {row.isPremium ? "Make Free" : "Make Premium"}
            </button>
          </div>
        )
      }
    ],
    [shorts]
  );

  const showColumns = useMemo<DataColumn<ShowRow>[]>(
    () => [
      { key: "title", header: "Show", render: (row) => row.title },
      { key: "slug", header: "Slug", render: (row) => row.slug },
      { key: "premium", header: "Premium", render: (row) => (row.isPremium ? "Yes" : "No") },
      { key: "price", header: "Price", render: (row) => (row.price != null ? `$${(row.price / 100).toFixed(2)}` : "-") },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <button type="button" onClick={() => patchShow(row, !row.isPremium, row.price)} className="rounded border border-illuvrse-border px-2 py-1 text-xs">
            {row.isPremium ? "Make Free" : "Make Premium"}
          </button>
        )
      }
    ],
    [shows]
  );

  const purchaseColumns = useMemo<DataColumn<PurchaseRow>[]>(
    () => [
      { key: "short", header: "Short", render: (row) => row.shortPost.title },
      { key: "price", header: "Price", render: (row) => (row.shortPost.price != null ? `$${(row.shortPost.price / 100).toFixed(2)}` : "-") },
      { key: "buyer", header: "Buyer", render: (row) => row.buyerId ?? row.buyerAnonId ?? "-" },
      { key: "time", header: "Purchased At", render: (row) => new Date(row.createdAt).toLocaleString() }
    ],
    [purchases]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold">Monetization Controls</h2>
        <p className="text-sm text-illuvrse-muted">Manage premium flags and pricing for shorts and watch content.</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search shorts/shows"
          className="mt-4 w-full rounded-xl border border-illuvrse-border px-4 py-2 md:max-w-lg"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6">Loading...</div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="font-semibold">Shorts Pricing</h3>
            <DataTable columns={shortColumns} rows={shorts} emptyMessage="No shorts found." />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Watch Content Pricing (Shows)</h3>
            <DataTable columns={showColumns} rows={shows} emptyMessage="No shows found." />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Purchase Records</h3>
            <DataTable columns={purchaseColumns} rows={purchases} emptyMessage="No purchases yet." />
          </div>
        </>
      )}
    </div>
  );
}
