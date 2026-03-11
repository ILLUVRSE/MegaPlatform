"use client";

import { useMemo, useState } from "react";
import type { MediaCorpWorldState, ReviewDecisionType } from "@illuvrse/media-corp-core";

type MemoryEntry = {
  id: string;
  franchiseId?: string;
  agentId?: string;
  kind: string;
  key: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type Props = {
  initialWorldState: MediaCorpWorldState;
  initialMemory: MemoryEntry[];
};

const DEFAULT_METRICS = {
  impressions: 1800,
  views: 920,
  opens: 360,
  clicks: 130,
  watchTime: 5400,
  completionRate: 0.58,
  likes: 110,
  shares: 42,
  saves: 37,
  comments: 18,
  reposts: 15,
  ctr: 0.07,
  engagementRate: 0.24,
  conversionProxy: 0.05,
  decayRate: 0.13,
  audienceRetention: 0.62,
  timeToFirstEngagementMin: 9
};

export default function MediaCorpDashboard({ initialWorldState, initialMemory }: Props) {
  const [worldState, setWorldState] = useState(initialWorldState);
  const [memory, setMemory] = useState(initialMemory);
  const [status, setStatus] = useState("");

  async function refresh() {
    setStatus("Refreshing sandbox media-corp state...");
    const response = await fetch("/api/admin/media-corp/state");
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus(`Snapshot refreshed at ${new Date(payload.worldState.generatedAt).toLocaleTimeString()}.`);
  }

  async function runCycle() {
    setStatus("Running synthetic distribution + learning cycle...");
    const response = await fetch("/api/admin/media-corp/run", { method: "POST" });
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus(
      `Cycle completed: ${payload.summary.releaseCandidatesCreated} releases, ${payload.summary.publishAttemptsCreated} publish attempts, ${payload.summary.recommendationsCreated} recommendations.`
    );
  }

  async function submitReview(artifactBundleId: string, decision: ReviewDecisionType) {
    setStatus(`Applying ${decision} decision...`);
    const response = await fetch("/api/admin/media-corp/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactBundleId, decision, reviewer: "media-corp-admin", notes: `Dashboard ${decision}.` })
    });
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus(`Bundle ${decision}d.`);
  }

  async function updateChannel(channelId: string, statusValue: "active" | "paused" | "sandbox_only") {
    setStatus(`Updating channel ${channelId}...`);
    const response = await fetch("/api/admin/media-corp/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, status: statusValue })
    });
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus(`Channel updated.`);
  }

  async function sandboxPublish(releaseCandidateId: string) {
    setStatus("Triggering sandbox publish...");
    const response = await fetch("/api/admin/media-corp/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseCandidateId })
    });
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus("Sandbox publish recorded.");
  }

  async function ingestMetrics(releaseCandidateId: string, channelId: string) {
    setStatus("Ingesting demo metrics...");
    const response = await fetch("/api/admin/media-corp/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseCandidateId, channelId, metrics: DEFAULT_METRICS })
    });
    const payload = await response.json();
    setWorldState(payload.worldState);
    setMemory(payload.memory);
    setStatus("Metrics ingested.");
  }

  const reviewQueue = worldState.artifactBundles.filter((bundle) => bundle.reviewStatus === "pending" || bundle.reviewStatus === "revise");
  const executiveSummary = useMemo(() => {
    const topFranchise = [...worldState.franchiseMetricsRollups].sort((a, b) => b.momentumScore - a.momentumScore)[0];
    const topChannel = [...worldState.channelMetricsRollups].sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];
    const topPrompt = [...worldState.promptPerformanceRollups].sort((a, b) => b.winRate - a.winRate)[0];
    return { topFranchise, topChannel, topPrompt };
  }, [worldState]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-illuvrse-border bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">ILLUVRSE Media Corp Sandbox</p>
            <h1 className="mt-2 text-3xl font-semibold">Synthetic distribution loop, analytics graph, and review controls</h1>
            <p className="mt-2 max-w-3xl text-sm text-illuvrse-muted">
              This admin view runs the real v1-v3 internal media-corp workflow, but publishing and metrics remain sandbox/demo paths. The larger v4 executive autonomy surface is only partially represented at runtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void refresh()} className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold">
              Refresh
            </button>
            <button type="button" onClick={() => void runCycle()} className="rounded-full bg-illuvrse-primary px-4 py-2 text-sm font-semibold text-white">
              Run Sandbox Cycle
            </button>
          </div>
        </div>
        {status ? <p className="mt-4 text-sm text-illuvrse-muted">{status}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-6">
        {[
          { label: "Channels", value: worldState.distributionChannels.length },
          { label: "Releases", value: worldState.releaseCandidates.length },
          { label: "Publish Attempts", value: worldState.publishAttempts.length },
          { label: "Campaigns", value: worldState.campaigns.length },
          { label: "Snapshots", value: worldState.performanceSnapshots.length },
          { label: "Recommendations", value: worldState.strategyRecommendations.length }
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-illuvrse-border bg-white p-5 shadow-card">
            <p className="text-xs uppercase tracking-[0.25em] text-illuvrse-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Operating Summary</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">{worldState.strategyRecommendations.length} active recommendations</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Top Franchise"
              title={executiveSummary.topFranchise?.franchiseId ?? "n/a"}
              value={String(executiveSummary.topFranchise?.momentumScore ?? 0)}
            />
            <SummaryCard
              label="Top Channel"
              title={executiveSummary.topChannel?.channelId ?? "n/a"}
              value={String(executiveSummary.topChannel?.efficiencyScore ?? 0)}
            />
            <SummaryCard
              label="Best Prompt"
              title={executiveSummary.topPrompt?.promptTemplateId ?? "n/a"}
              value={String(executiveSummary.topPrompt?.winRate ?? 0)}
            />
          </div>
          <div className="mt-4 space-y-3">
            {worldState.strategyRecommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-xl border border-illuvrse-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{recommendation.recommendationType}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">confidence {recommendation.confidence}</span>
                </div>
                <p className="mt-2 text-sm">{recommendation.action}</p>
                <p className="mt-2 text-xs text-illuvrse-muted">{recommendation.rationale.join(" ")}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <div className="mt-4 space-y-3">
              {reviewQueue.map((bundle) => (
                <div key={bundle.id} className="rounded-xl border border-illuvrse-border p-4">
                  <p className="font-semibold">{bundle.title}</p>
                  <p className="mt-1 text-sm text-illuvrse-muted">{bundle.medium}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void submitReview(bundle.id, "approve")} className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">Approve</button>
                    <button type="button" onClick={() => void submitReview(bundle.id, "revise")} className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">Revise</button>
                    <button type="button" onClick={() => void submitReview(bundle.id, "reject")} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold">Memory Feed</h2>
            <div className="mt-4 space-y-3">
              {memory.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-illuvrse-border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                    <span>{entry.kind}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{entry.key}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Channel Registry</h2>
          <div className="mt-4 space-y-3">
            {worldState.distributionChannels.map((channel) => (
              <div key={channel.id} className="rounded-xl border border-illuvrse-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{channel.name}</p>
                    <p className="text-sm text-illuvrse-muted">{channel.slug} • {channel.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void updateChannel(channel.id, "active")} className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold">Active</button>
                    <button type="button" onClick={() => void updateChannel(channel.id, "paused")} className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold">Pause</button>
                    <button type="button" onClick={() => void updateChannel(channel.id, "sandbox_only")} className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold">Sandbox</button>
                  </div>
                </div>
                <p className="mt-2 text-sm">{channel.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Publish Queue</h2>
          <div className="mt-4 space-y-3">
            {worldState.releaseCandidates.map((candidate) => {
              const latestAttempt = worldState.publishAttempts.find((item) => item.releaseCandidateId === candidate.id);
              return (
                <div key={candidate.id} className="rounded-xl border border-illuvrse-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{candidate.packageTitle}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">{candidate.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-illuvrse-muted">{candidate.channel}</p>
                  <p className="mt-2 text-xs text-illuvrse-muted">Latest attempt: {latestAttempt?.status ?? "none"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void sandboxPublish(candidate.id)} className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold">
                      Sandbox Publish
                    </button>
                    <button type="button" onClick={() => void ingestMetrics(candidate.id, latestAttempt?.channelId ?? worldState.distributionChannels[0]?.id)} className="rounded-full border border-illuvrse-border px-3 py-1 text-xs font-semibold">
                      Ingest Demo Metrics
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Publish Attempt History</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-illuvrse-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
                <tr>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {worldState.publishAttempts.map((attempt) => (
                  <tr key={attempt.id} className="border-t border-illuvrse-border">
                    <td className="px-4 py-3">{attempt.id}</td>
                    <td className="px-4 py-3">{attempt.channelId}</td>
                    <td className="px-4 py-3">{attempt.mode}</td>
                    <td className="px-4 py-3">{attempt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Campaigns and Experiments</h2>
          <div className="mt-4 space-y-3">
            {worldState.campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-illuvrse-border p-4">
                <p className="font-semibold">{campaign.title}</p>
                <p className="mt-1 text-sm text-illuvrse-muted">{campaign.type} • {campaign.objective}</p>
                <p className="mt-2 text-xs text-illuvrse-muted">Items {campaign.campaignItemIds.length}</p>
              </div>
            ))}
            {worldState.experimentAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-illuvrse-border p-4">
                <p className="font-semibold">{assignment.experimentId}</p>
                <p className="mt-1 text-sm text-illuvrse-muted">{assignment.variantKey} • {assignment.status}</p>
                <p className="mt-2 text-xs text-illuvrse-muted">{assignment.hypothesis}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Performance and Attribution</h2>
          <div className="mt-4 space-y-4">
            {worldState.franchiseMetricsRollups.map((rollup) => (
              <div key={rollup.id} className="rounded-xl border border-illuvrse-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{rollup.franchiseId}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">momentum {rollup.momentumScore}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <MetricCard label="Views" value={rollup.metrics.views} />
                  <MetricCard label="CTR" value={Math.round(rollup.metrics.ctr * 100)} />
                  <MetricCard label="Engagement" value={Math.round(rollup.metrics.engagementRate * 100)} />
                  <MetricCard label="Retention" value={Math.round(rollup.metrics.audienceRetention * 100)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-illuvrse-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Prompt and Channel Winners</h2>
          <div className="mt-4 space-y-3">
            {worldState.channelMetricsRollups.map((rollup) => (
              <div key={rollup.id} className="rounded-xl border border-illuvrse-border p-4">
                <p className="font-semibold">{rollup.channelId}</p>
                <p className="mt-1 text-sm text-illuvrse-muted">efficiency {rollup.efficiencyScore}</p>
              </div>
            ))}
            {worldState.promptPerformanceRollups.map((rollup) => (
              <div key={rollup.id} className="rounded-xl border border-illuvrse-border p-4">
                <p className="font-semibold">{rollup.promptTemplateId}</p>
                <p className="mt-1 text-sm text-illuvrse-muted">win rate {rollup.winRate}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({ label, title, value }: { label: string; title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">{label}</p>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
