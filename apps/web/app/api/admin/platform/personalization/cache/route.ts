export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getPersonalizationCacheSnapshot } from "@/lib/intelligence/personalizationCache";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    cache: getPersonalizationCacheSnapshot()
  });
}
