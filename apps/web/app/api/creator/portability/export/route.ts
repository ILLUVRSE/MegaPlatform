export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { buildCreatorExportPayload } from "@/lib/creatorPortability";

export async function GET() {
  const principal = await requireSession();
  const payload = await buildCreatorExportPayload(principal.userId);
  return NextResponse.json({ ok: true, payload });
}
