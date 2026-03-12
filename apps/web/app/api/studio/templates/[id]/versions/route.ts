export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";

const versionSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(400).optional().nullable(),
  schemaJson: z.record(z.string(), z.unknown()).default({})
});

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

  const parsed = versionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = await params;
  const creatorProfile = await ensureCreatorProfile({
    id: principal.userId,
    name: principal.name,
    email: principal.email
  });

  const template = await prisma.studioTemplate.findUnique({
    where: { id },
    select: { id: true, creatorProfileId: true, latestVersion: true }
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (template.creatorProfileId !== creatorProfile.id && principal.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = template.latestVersion + 1;
  const result = await prisma.studioTemplate.update({
    where: { id: template.id },
    data: {
      latestVersion: version,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      versions: {
        create: {
          version,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          schemaJson: parsed.data.schemaJson as Prisma.InputJsonValue
        }
      }
    },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 }
    }
  });

  return NextResponse.json({ template: result });
}
