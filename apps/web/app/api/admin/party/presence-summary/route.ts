export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildPartyPresenceSummary } from "@/lib/platformPresence";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await buildPartyPresenceSummary({ alertOnBreach: true });
  return NextResponse.json({
    ok: true,
    ...summary
  });
}
