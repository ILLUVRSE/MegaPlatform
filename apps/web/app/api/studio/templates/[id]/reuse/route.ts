export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

const TEMPLATE_KIND_TO_PROJECT_TYPE = {
  SHORT: "SHORT",
  MEME: "MEME",
  GAME: "GAME"
} as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const template = await prisma.studioTemplate.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } }
  });
  if (!template || !template.isPublished) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const creatorProfile = await ensureCreatorProfile({
    id: principal.userId,
    name: principal.name,
    email: principal.email
  });
  const latest = template.versions[0];

  const project = await prisma.studioProject.create({
    data: {
      type: TEMPLATE_KIND_TO_PROJECT_TYPE[template.kind],
      title: template.title,
      description: template.description,
      status: "DRAFT",
      createdById: principal.userId,
      creatorProfileId: creatorProfile.id
    }
  });

  return NextResponse.json({
    project,
    template: {
      id: template.id,
      version: latest?.version ?? template.latestVersion,
      schemaJson: latest?.schemaJson ?? {}
    }
  });
}
