export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  createShowProject,
  listShowProjects,
  type ShowProjectFormat,
  type ShowProjectStatus
} from "@/lib/showProjects";

const createShowProjectSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().nullable(),
  format: z.enum(["SERIES", "MOVIE"]).default("SERIES"),
  posterImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  bannerImageUrl: z.string().url().optional().nullable().or(z.literal(""))
});

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

  const parsed = createShowProjectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const project = await createShowProject({
    ownerId: principal.userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    format: parsed.data.format,
    posterImageUrl: parsed.data.posterImageUrl || null,
    bannerImageUrl: parsed.data.bannerImageUrl || null
  });

  return NextResponse.json({ project }, { status: 201 });
}

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

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const status = searchParams.get("status");

  const parsedQuery = z
    .object({
      format: z.enum(["SERIES", "MOVIE"]).optional(),
      status: z.enum(["DRAFT", "IN_PRODUCTION", "READY_TO_PUBLISH", "PUBLISHED"]).optional()
    })
    .safeParse({
      format: format ?? undefined,
      status: status ?? undefined
    });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const projects = await listShowProjects(principal, {
    format: parsedQuery.data.format as ShowProjectFormat | undefined,
    status: parsedQuery.data.status as ShowProjectStatus | undefined
  });

  return NextResponse.json({ projects });
}
