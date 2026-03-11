import { FEED_TRUST_POLICY, WALL_RANKING_POLICY } from "@/lib/feedPolicy";

export default function AdminFeedSettingsPage() {
  return (
    <div className="space-y-4 rounded-2xl border border-illuvrse-border bg-white p-6">
      <h2 className="text-xl font-semibold">Home Feed Settings</h2>
      <p className="text-sm text-illuvrse-muted">
        Active Phase 11 defaults for ranking and trust-safety automation.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-illuvrse-border bg-illuvrse-bg p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Ranking</p>
          <p className="mt-1 text-sm">Candidate window: {WALL_RANKING_POLICY.candidateTake}</p>
          <p className="text-sm">Page size: {WALL_RANKING_POLICY.pageSize}</p>
          <p className="text-sm">Recency half-life: {WALL_RANKING_POLICY.recencyHalfLifeHours}h</p>
        </div>
        <div className="rounded-xl border border-illuvrse-border bg-illuvrse-bg p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Auto Moderation</p>
          <p className="mt-1 text-sm">Auto-hide unresolved reports: {FEED_TRUST_POLICY.hideUnresolvedReportsThreshold}</p>
          <p className="text-sm">Auto-hide unique reporters: {FEED_TRUST_POLICY.hideUniqueReporterThreshold}</p>
          <p className="text-sm">Auto-shadow unresolved reports: {FEED_TRUST_POLICY.shadowbanUnresolvedReportsThreshold}</p>
        </div>
      </div>
    </div>
  );
}
