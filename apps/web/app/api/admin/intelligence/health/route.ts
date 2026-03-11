export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getIntelligenceGatewayHealth } from "@/lib/intelligence/gateway";
import { apiUnauthorized } from "@/lib/apiError";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return apiUnauthorized();
  }

  return NextResponse.json(getIntelligenceGatewayHealth());
}
