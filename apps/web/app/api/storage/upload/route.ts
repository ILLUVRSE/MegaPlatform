export const dynamic = "force-dynamic";

/**
 * Storage upload API (data URL to S3).
 * POST: { dataUrl, filename } -> { url }
 * Guard: authenticated creator/admin + per-user rate limit.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadBuffer } from "@illuvrse/storage";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const uploadSchema = z.object({
  dataUrl: z.string().min(10),
  filename: z.string().min(1)
});

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { contentType: match[1], data: Buffer.from(match[2], "base64") };
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

  const rateLimit = await checkRateLimit({
    key: `storage:upload:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 20
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsedData = parseDataUrl(parsed.data.dataUrl);
  if (!parsedData) {
    return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
  }

  const key = `uploads/${Date.now()}-${parsed.data.filename}`;
  const url = await uploadBuffer(key, parsedData.data, parsedData.contentType);
  return NextResponse.json({ url });
}
