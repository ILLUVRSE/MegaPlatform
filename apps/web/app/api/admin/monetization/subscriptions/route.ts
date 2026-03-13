export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildSubscriptionAnalytics } from "@/lib/subscriptionLifecycle";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analytics = await buildSubscriptionAnalytics();
  return NextResponse.json({ data: analytics });
}
