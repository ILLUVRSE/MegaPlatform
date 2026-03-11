export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildDeploymentStatus } from "@/lib/platformGovernance";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await buildDeploymentStatus();
  return NextResponse.json({
    ok: true,
    ...status
  });
}
