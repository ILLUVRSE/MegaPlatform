import Link from "next/link";
import type { StudioEpisodeWatchAnalytics, StudioShowWatchAnalytics } from "@/lib/studioWatchAnalytics";

type Props = {
  analytics: StudioShowWatchAnalytics | StudioEpisodeWatchAnalytics;
};

function MetricCard({
  label,
  metric
}: {
  label: string;
  metric: { value: number | null; available: boolean; detail: string };
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-white/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">
        {metric.available ? (metric.value ?? 0).toLocaleString() : "Unavailable"}
      </p>
      <p className="mt-2 text-sm text-white/65">{metric.detail}</p>
    </div>
  );
}

export default function StudioWatchAnalyticsPanel({ analytics }: Props) {
  const isShow = analytics.scope === "show";

  return (
    <section className="party-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Watch Analytics</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Published performance snapshot</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            Read-only rollup from the current Watch and Shorts records. This stays intentionally lightweight and does
            not backfill missing event history.
          </p>
        </div>
        {analytics.watchHref ? (
          <Link
            href={analytics.watchHref}
            className="interactive-focus rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
          >
            Open in Watch
          </Link>
        ) : (
          <div className="rounded-full border border-dashed border-white/15 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/50">
            Not published to Watch
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Views" metric={analytics.views} />
        <MetricCard label="Likes" metric={analytics.reactions} />
        <MetricCard label="Completions" metric={analytics.completions} />
        <MetricCard label="Published Shorts" metric={analytics.publishedShorts} />
      </div>

      {isShow ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Published Episodes</p>
            <p className="mt-2 text-lg font-semibold text-white">{analytics.publishedEpisodes.toLocaleString()}</p>
            <p className="mt-2 text-sm text-white/65">Studio episodes currently marked published.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Synced Watch Episodes</p>
            <p className="mt-2 text-lg font-semibold text-white">{analytics.syncedWatchEpisodes.toLocaleString()}</p>
            <p className="mt-2 text-sm text-white/65">Published episodes that have corresponding Watch records.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
