export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

const createSchema = z.object({
  sourceAssetId: z.string().min(1),
  prompt: z.string().max(300).optional()
});

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

  const jobs = await prisma.remixJob.findMany({
    where: { requestedById: principal.userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const source = await prisma.studioAsset.findUnique({
    where: { id: parsed.data.sourceAssetId },
    include: {
      project: true,
      lineage: true
    }
  });
  if (!source) return NextResponse.json({ error: "Source asset not found" }, { status: 404 });

  if (!source.lineage) {
    return NextResponse.json({ error: "Remix blocked: missing lineage record." }, { status: 409 });
  }
  if (source.lineage.rightsStatus === "RESTRICTED") {
    return NextResponse.json({ error: "Remix blocked: rights restricted for source asset." }, { status: 409 });
  }

  const latestQa = await prisma.contentQaResult.findFirst({
    where: { projectId: source.projectId },
    orderBy: { createdAt: "desc" }
  });
  if (!latestQa || latestQa.status !== "PASS") {
    return NextResponse.json({ error: "Remix blocked: source project did not pass QA." }, { status: 409 });
  }

  const creatorProfile = await ensureCreatorProfile({
    id: principal.userId,
    name: principal.name,
    email: principal.email
  });

  const remixProject = await prisma.studioProject.create({
    data: {
      type: "REMIX",
      title: `${source.project.title} Remix`,
      description: parsed.data.prompt ?? source.project.description,
      status: "QUEUED",
      createdById: principal.userId,
      creatorProfileId: creatorProfile.id
    }
  });

  const job = await prisma.remixJob.create({
    data: {
      projectId: remixProject.id,
      sourceAssetId: source.id,
      requestedById: principal.userId,
      status: "QUEUED",
      prompt: parsed.data.prompt ?? null,
      metadataJson: {
        sourceProjectId: source.projectId,
        sourceRightsStatus: source.lineage.rightsStatus
      }
    }
  });

  return NextResponse.json({ job, project: remixProject });
}
