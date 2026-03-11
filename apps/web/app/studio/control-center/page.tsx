"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionHeader from "@/components/ui/SectionHeader";

type ControlCenterPayload = {
  creator: { handle: string; displayName: string };
  progression: { level: number; xp: number; tier: string; rewardsEarned: number };
  performance: { projectsTotal: number; publishedProjects: number; templatesTotal: number; publishedTemplates: number };
  earnings: { revenueCents30d: number; purchases30d: number };
  tasks: {
    pendingRemixJobs: Array<{ id: string; status: string }>;
    pendingStudioProjects: Array<{ id: string; status: string; type: string }>;
  };
};

export default function CreatorControlCenterPage() {
  const [payload, setPayload] = useState<ControlCenterPayload | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/creator/control-center")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load creator control center.");
        return (await res.json()) as ControlCenterPayload;
      })
      .then((data) => setPayload(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load data"));
  }, []);

  if (error) {
    return <SurfaceCard className="p-4 text-sm text-illuvrse-danger">{error}</SurfaceCard>;
  }
  if (!payload) {
    return <SurfaceCard className="p-4 text-sm text-illuvrse-muted">Loading creator control center...</SurfaceCard>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Creator Control Center"
        title={`${payload.creator.displayName} (@${payload.creator.handle})`}
        description="Manage performance, earnings, and active creator tasks from one workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Progression</p>
          <p className="text-2xl font-semibold">Lv {payload.progression.level}</p>
          <p className="text-sm text-illuvrse-muted">{payload.progression.xp} XP · {payload.progression.tier}</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">30d Revenue</p>
          <p className="text-2xl font-semibold">${(payload.earnings.revenueCents30d / 100).toFixed(2)}</p>
          <p className="text-sm text-illuvrse-muted">{payload.earnings.purchases30d} paid conversions</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Projects</p>
          <p className="text-2xl font-semibold">{payload.performance.publishedProjects}/{payload.performance.projectsTotal}</p>
          <p className="text-sm text-illuvrse-muted">Published / total</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-illuvrse-muted">Templates</p>
          <p className="text-2xl font-semibold">{payload.performance.publishedTemplates}/{payload.performance.templatesTotal}</p>
          <p className="text-sm text-illuvrse-muted">Published / total</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Pending Tasks</h2>
          <p className="text-sm text-illuvrse-muted">
            Remix jobs: {payload.tasks.pendingRemixJobs.length} · Studio jobs: {payload.tasks.pendingStudioProjects.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/ops" className="party-button inline-flex w-fit">Open Studio Ops</Link>
            <Link href="/studio/content" className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold">Review Content</Link>
          </div>
        </SurfaceCard>
        <SurfaceCard className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Creator Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/short" className="party-button inline-flex w-fit">Create Short</Link>
            <Link href="/studio/meme" className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold">Create Meme</Link>
            <Link href="/studio/content" className="rounded-full border border-illuvrse-border px-4 py-2 text-sm font-semibold">Content Ops</Link>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
