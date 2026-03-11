export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { validateCreatorImportPayload } from "@/lib/creatorPortability";

export async function POST(req: Request) {
  await requireSession();
  const parsed = await validateCreatorImportPayload(await req.json());
  if (!parsed.ok) return NextResponse.json({ ok: false, reason: parsed.reason }, { status: 400 });
  return NextResponse.json({
    ok: true,
    importedAssets: parsed.payload.assets.length
  });
}
