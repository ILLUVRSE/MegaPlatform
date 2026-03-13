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

type SubscriptionRow = {
  id: string;
  userId: string;
  planId: string;
  cohort: string;
  status: "trialing" | "active" | "past_due" | "cancelled";
  autoConvertOptIn: boolean;
  trialEndsAt: string;
  convertedAt: string | null;
  billingRetryCount: number;
  dunningStage: string | null;
};

type CohortMetric = {
  cohort: string;
  trialStarts: number;
  reminderSent: number;
  paidConversions: number;
  activePaid: number;
  cancelled: number;
  pastDue: number;
  recovered: number;
  conversionRate: number;
};

type SubscriptionEventRow = {
  id: string;
  subscriptionId: string;
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export default function MonetizationPage() {
  const [query, setQuery] = useState("");
  const [shorts, setShorts] = useState<ShortRow[]>([]);
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortMetric[]>([]);
  const [subscriptionEvents, setSubscriptionEvents] = useState<SubscriptionEventRow[]>([]);
  const [overview, setOverview] = useState({ totalTrials: 0, activePaid: 0, pastDue: 0, cancelled: 0, converted: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [shortPayload, showPayload, purchasePayload, subscriptionPayload] = await Promise.all([
      fetch(`/api/admin/monetization/shorts?q=${encodeURIComponent(query)}`).then((res) => res.json()),
      fetch(`/api/admin/monetization/shows?q=${encodeURIComponent(query)}`).then((res) => res.json()),
      fetch("/api/admin/monetization/purchases").then((res) => res.json()),
      fetch("/api/admin/monetization/subscriptions").then((res) => res.json())
    ]);
    setShorts(shortPayload.data ?? []);
    setShows(showPayload.data ?? []);
    setPurchases(purchasePayload.data ?? []);
    setSubscriptions(subscriptionPayload.data?.subscriptions ?? []);
    setCohorts(subscriptionPayload.data?.cohorts ?? []);
    setSubscriptionEvents(subscriptionPayload.data?.events ?? []);
    setOverview(subscriptionPayload.data?.overview ?? { totalTrials: 0, activePaid: 0, pastDue: 0, cancelled: 0, converted: 0 });
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

  const subscriptionColumns = useMemo<DataColumn<SubscriptionRow>[]>(
    () => [
      { key: "userId", header: "User", render: (row) => row.userId },
      { key: "planId", header: "Plan", render: (row) => row.planId },
      { key: "cohort", header: "Cohort", render: (row) => row.cohort },
      { key: "status", header: "Status", render: (row) => row.status },
      { key: "autoConvert", header: "Auto-Convert", render: (row) => (row.autoConvertOptIn ? "Opted In" : "Opted Out") },
      { key: "trialEndsAt", header: "Trial Ends", render: (row) => new Date(row.trialEndsAt).toLocaleDateString() },
      { key: "billingRetryCount", header: "Retries", render: (row) => `${row.billingRetryCount}` },
      { key: "dunningStage", header: "Dunning", render: (row) => row.dunningStage ?? "-" }
    ],
    [subscriptions]
  );

  const cohortColumns = useMemo<DataColumn<CohortMetric>[]>(
    () => [
      { key: "cohort", header: "Cohort", render: (row) => row.cohort },
      { key: "trialStarts", header: "Trials", render: (row) => `${row.trialStarts}` },
      { key: "reminderSent", header: "Reminders", render: (row) => `${row.reminderSent}` },
      { key: "paidConversions", header: "Paid", render: (row) => `${row.paidConversions}` },
      { key: "activePaid", header: "Active", render: (row) => `${row.activePaid}` },
      { key: "pastDue", header: "Past Due", render: (row) => `${row.pastDue}` },
      { key: "cancelled", header: "Cancelled", render: (row) => `${row.cancelled}` },
      { key: "conversionRate", header: "Conversion", render: (row) => `${Math.round(row.conversionRate * 100)}%` }
    ],
    [cohorts]
  );

  const eventColumns = useMemo<DataColumn<SubscriptionEventRow>[]>(
    () => [
      { key: "type", header: "Event", render: (row) => row.type },
      { key: "subscriptionId", header: "Subscription", render: (row) => row.subscriptionId },
      { key: "createdAt", header: "When", render: (row) => new Date(row.createdAt).toLocaleString() },
      { key: "metadata", header: "Details", render: (row) => (row.metadata ? JSON.stringify(row.metadata) : "-") }
    ],
    [subscriptionEvents]
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
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-illuvrse-border bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-illuvrse-muted">Trials</div>
              <div className="mt-2 text-2xl font-semibold">{overview.totalTrials}</div>
            </div>
            <div className="rounded-2xl border border-illuvrse-border bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-illuvrse-muted">Converted</div>
              <div className="mt-2 text-2xl font-semibold">{overview.converted}</div>
            </div>
            <div className="rounded-2xl border border-illuvrse-border bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-illuvrse-muted">Active Paid</div>
              <div className="mt-2 text-2xl font-semibold">{overview.activePaid}</div>
            </div>
            <div className="rounded-2xl border border-illuvrse-border bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-illuvrse-muted">Past Due</div>
              <div className="mt-2 text-2xl font-semibold">{overview.pastDue}</div>
            </div>
            <div className="rounded-2xl border border-illuvrse-border bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-illuvrse-muted">Cancelled</div>
              <div className="mt-2 text-2xl font-semibold">{overview.cancelled}</div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Trial Retention Cohorts</h3>
            <DataTable columns={cohortColumns} rows={cohorts} emptyMessage="No trial cohorts yet." />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Subscription Lifecycle</h3>
            <DataTable columns={subscriptionColumns} rows={subscriptions} emptyMessage="No subscription activity yet." />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Billing and Dunning Events</h3>
            <DataTable columns={eventColumns} rows={subscriptionEvents} emptyMessage="No subscription events yet." />
          </div>
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
