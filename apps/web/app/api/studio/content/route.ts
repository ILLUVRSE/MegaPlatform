export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import { contentDb } from "@/lib/contentDb";

const createSchema = z.object({
  type: z.string().trim().min(2).max(40),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable()
});

const listSchema = z.object({
  cursor: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
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

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const content = await contentDb.contentItem.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      state: "DRAFT",
      creatorId: principal.userId
    }
  });

  return NextResponse.json({ content }, { status: 201 });
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
  const parsed = listSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const items = await contentDb.contentItem.findMany({
    where: {
      creatorId: principal.userId,
      ...(parsed.data.status ? { state: parsed.data.status as never } : {})
    },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
    ...(parsed.data.cursor ? { skip: 1, cursor: { id: parsed.data.cursor } } : {}),
    include: {
      assets: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });

  const nextCursor = items.length === parsed.data.limit ? items[items.length - 1]?.id ?? null : null;

  return NextResponse.json({ items, nextCursor });
}
