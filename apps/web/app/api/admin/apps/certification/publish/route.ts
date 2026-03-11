export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { runModuleCertification } from "@/lib/moduleCertification";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = await runModuleCertification(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, certification: result }, { status: 409 });
  }

  return NextResponse.json({ ok: true, publicationReady: true, certification: result });
}
