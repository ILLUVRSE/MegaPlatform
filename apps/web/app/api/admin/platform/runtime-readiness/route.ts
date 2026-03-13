import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { evaluatePlatformRuntimeReadiness } from "@/lib/platformRuntimeReadiness";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = evaluatePlatformRuntimeReadiness();
  return NextResponse.json(
    {
      ok: readiness.ok,
      summary: readiness.summary,
      blockers: readiness.blockers,
      apiRegistry: readiness.apiRegistry,
      readiness
    },
    { status: readiness.ok ? 200 : 503 }
  );
}
