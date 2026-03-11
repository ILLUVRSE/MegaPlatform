export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

export async function GET(request: Request) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creatorProfile = await ensureCreatorProfile({
    id: principal.userId,
    name: principal.name,
    email: principal.email
  });

  const [projects, templates, progression, revenueRows, pendingRemix, pendingStudio] = await Promise.all([
    prisma.studioProject.findMany({
      where: { creatorProfileId: creatorProfile.id },
      select: { id: true, status: true, type: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    }),
    prisma.studioTemplate.findMany({
      where: { creatorProfileId: creatorProfile.id },
      select: { id: true, title: true, latestVersion: true, kind: true, isPublished: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.creatorProgression.findUnique({ where: { creatorProfileId: creatorProfile.id } }),
    prisma.revenueAttribution.findMany({
      where: {
        creatorProfileId: creatorProfile.id,
        occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: { actionType: true, revenueCents: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: 100
    }),
    prisma.remixJob.findMany({
      where: { requestedById: principal.userId, status: { in: ["QUEUED", "PROCESSING"] } },
      select: { id: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.studioProject.findMany({
      where: { creatorProfileId: creatorProfile.id, status: { in: ["QUEUED", "PROCESSING"] } },
      select: { id: true, status: true, type: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    })
  ]);

  const revenue30d = revenueRows.reduce((sum, row) => sum + row.revenueCents, 0);
  const purchases30d = revenueRows.filter((row) => row.actionType === "short_purchase").length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    creator: {
      id: creatorProfile.id,
      handle: creatorProfile.handle,
      displayName: creatorProfile.displayName,
      reputationScore: creatorProfile.reputationScore
    },
    progression: progression ?? {
      level: 1,
      xp: 0,
      tier: "RISING",
      rewardsEarned: 0
    },
    performance: {
      projectsTotal: projects.length,
      publishedProjects: projects.filter((item) => item.status === "PUBLISHED").length,
      templatesTotal: templates.length,
      publishedTemplates: templates.filter((item) => item.isPublished).length
    },
    earnings: {
      revenueCents30d: revenue30d,
      purchases30d
    },
    tasks: {
      pendingRemixJobs: pendingRemix,
      pendingStudioProjects: pendingStudio
    },
    recent: {
      projects: projects.slice(0, 8),
      templates: templates.slice(0, 8),
      revenueEvents: revenueRows.slice(0, 12)
    }
  });
}
