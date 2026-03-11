import Link from "next/link";
import { prisma } from "@illuvrse/db";
import { buildDailyTrend, getRangeSince, PLATFORM_RANGE_OPTIONS, resolvePlatformRange } from "@/lib/platformAnalytics";

type CountRow = { key: string; count: bigint };
type RecentEventRow = {
  id: string;
  event: string;
  module: string;
  surface: string;
  href: string;
  createdAt: Date;
};

function toPercent(part: number, total: number) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

type TrendRow = { day: Date; count: bigint };

export default async function AdminPlatformAnalyticsPage({
  searchParams
}: {
  searchParams?: Promise<{ range?: string }> | { range?: string };
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const range = resolvePlatformRange(params?.range);
  const since = getRangeSince(range);
  const now = new Date();

  const [totalRows, moduleRows, surfaceRows, destinationRows, trendRows, latest] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT "module" AS key, COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY "module"
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT "surface" AS key, COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY "surface"
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT "href" AS key, COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY "href"
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `,
    prisma.$queryRaw<RecentEventRow[]>`
      SELECT "id", "event", "module", "surface", "href", "createdAt"
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${since}
      ORDER BY "createdAt" DESC
      LIMIT 25
    `
  ]);

  const totalInRange = Number(totalRows[0]?.count ?? 0n);
  const dailyTrend = buildDailyTrend(trendRows, since, now);
  const maxTrendCount = Math.max(...dailyTrend.map((row) => row.count), 1);
  const selectedRangeLabel = PLATFORM_RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "Last 7 Days";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Platform Analytics</p>
        <h2 className="mt-2 text-2xl font-semibold">Cross-App Engagement ({selectedRangeLabel})</h2>
        <p className="mt-2 text-sm text-illuvrse-muted">
          Module launches and navigation events from core shell surfaces and embedded app entry points.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLATFORM_RANGE_OPTIONS.map((option) => (
            <Link
              key={option.key}
              href={`/admin/platform?range=${option.key}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                option.key === range
                  ? "border-illuvrse-primary bg-illuvrse-primary text-white"
                  : "border-illuvrse-border text-illuvrse-muted"
              }`}
            >
              {option.label}
            </Link>
          ))}
          <a
            href={`/api/admin/platform/events/export?range=${range}`}
            className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold uppercase tracking-widest text-illuvrse-muted"
          >
            Export CSV
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Events ({range})</p>
          <p className="mt-2 text-3xl font-semibold">{totalInRange}</p>
        </article>
        <article className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Top Module</p>
          <p className="mt-2 text-3xl font-semibold">{moduleRows[0]?.key ?? "N/A"}</p>
          <p className="mt-1 text-sm text-illuvrse-muted">{Number(moduleRows[0]?.count ?? 0n)} events</p>
        </article>
        <article className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Top Surface</p>
          <p className="mt-2 text-3xl font-semibold">{surfaceRows[0]?.key ?? "N/A"}</p>
          <p className="mt-1 text-sm text-illuvrse-muted">{Number(surfaceRows[0]?.count ?? 0n)} events</p>
        </article>
      </section>

      <section className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold">Daily Event Trend</h3>
        <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-2">
          {dailyTrend.map((row) => {
            const height = Math.max(8, Math.round((row.count / maxTrendCount) * 140));
            return (
              <div key={row.dayKey} className="flex min-w-[42px] flex-col items-center gap-2">
                <div
                  className="w-6 rounded-t bg-illuvrse-primary"
                  style={{ height }}
                  aria-label={`Events on ${row.dayKey}: ${row.count}`}
                  title={`${row.dayKey}: ${row.count}`}
                />
                <p className="text-[10px] font-semibold text-illuvrse-muted">{row.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
          <h3 className="text-lg font-semibold">Top Modules</h3>
          <div className="mt-4 space-y-3">
            {moduleRows.length === 0 ? (
              <p className="text-sm text-illuvrse-muted">No module events yet.</p>
            ) : (
              moduleRows.map((row) => {
                const count = Number(row.count);
                return (
                  <div key={row.key} className="rounded-xl border border-illuvrse-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{row.key}</p>
                      <p className="text-sm text-illuvrse-muted">{count}</p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                      {toPercent(count, totalInRange)} of in-range traffic
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
          <h3 className="text-lg font-semibold">Top Surfaces</h3>
          <div className="mt-4 space-y-3">
            {surfaceRows.length === 0 ? (
              <p className="text-sm text-illuvrse-muted">No surface events yet.</p>
            ) : (
              surfaceRows.map((row) => {
                const count = Number(row.count);
                return (
                  <div key={row.key} className="rounded-xl border border-illuvrse-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{row.key}</p>
                      <p className="text-sm text-illuvrse-muted">{count}</p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                      {toPercent(count, totalInRange)} of in-range traffic
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold">Top Destinations (Href)</h3>
        <div className="mt-4 space-y-3">
          {destinationRows.length === 0 ? (
            <p className="text-sm text-illuvrse-muted">No destination events yet.</p>
          ) : (
            destinationRows.map((row) => {
              const count = Number(row.count);
              return (
                <div key={row.key} className="rounded-xl border border-illuvrse-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-mono text-xs">{row.key}</p>
                    <p className="text-sm text-illuvrse-muted">{count}</p>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                    {toPercent(count, totalInRange)} of in-range traffic
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold">Recent Events ({selectedRangeLabel})</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
              <tr>
                <th className="px-2 py-2">When</th>
                <th className="px-2 py-2">Event</th>
                <th className="px-2 py-2">Module</th>
                <th className="px-2 py-2">Surface</th>
                <th className="px-2 py-2">Href</th>
              </tr>
            </thead>
            <tbody>
              {latest.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-illuvrse-muted" colSpan={5}>
                    No events tracked yet.
                  </td>
                </tr>
              ) : (
                latest.map((event) => (
                  <tr key={event.id} className="border-t border-illuvrse-border">
                    <td className="px-2 py-3 text-illuvrse-muted">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-3 font-semibold">{event.event}</td>
                    <td className="px-2 py-3">{event.module}</td>
                    <td className="px-2 py-3">{event.surface}</td>
                    <td className="px-2 py-3 text-illuvrse-muted">{event.href}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
