export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthzError, requireSession } from "@/lib/authz";
import {
  createShowTemplateFromProject,
  createShowTemplateSchema,
  listShowTemplateSummaries
} from "@/lib/showTemplates";

const querySchema = z.object({
  templateType: z.enum(["SERIES", "MOVIE"]).optional(),
  mine: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((value) => value === "1" || value === "true")
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

  const { searchParams } = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    templateType: searchParams.get("templateType") ?? undefined,
    mine: searchParams.get("mine") ?? undefined
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsedQuery.error.issues }, { status: 400 });
  }

  const templates = await listShowTemplateSummaries(principal);
  const filtered = templates.filter((template) => {
    if (parsedQuery.data.templateType && template.templateType !== parsedQuery.data.templateType) {
      return false;
    }
    if (parsedQuery.data.mine && template.createdById !== principal.userId) {
      return false;
    }
    return true;
  });

  return NextResponse.json({ templates: filtered });
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

  const parsed = createShowTemplateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const template = await createShowTemplateFromProject(principal, parsed.data);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save template.";
    const status = message === "Forbidden" ? 403 : message === "Show project not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
