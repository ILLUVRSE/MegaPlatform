export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { bridgeExternalTelemetry } from "@/lib/openTelemetryBridge";
import { insertPlatformEvent } from "@/lib/platformEvents";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bridged = await bridgeExternalTelemetry(body);

  if (!bridged.ok) {
    return NextResponse.json({ ok: false, reason: bridged.reason }, { status: 409 });
  }

  await insertPlatformEvent({
    event: bridged.canonical.event,
    module: bridged.canonical.module,
    href: bridged.canonical.href,
    surface: bridged.canonical.surface
  });

  return NextResponse.json({ ok: true, canonical: bridged.canonical });
}
