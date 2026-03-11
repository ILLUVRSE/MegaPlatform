export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { buildProductionCertificationStatus } from "@/lib/productionCertification";

const payloadSchema = z.object({
  releaseId: z.string().min(1)
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await buildProductionCertificationStatus(prisma);
  return NextResponse.json({
    ok: true,
    ...status
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const status = await buildProductionCertificationStatus(prisma);
  if (!status.certifiable) {
    return NextResponse.json(
      { error: "certification blocked", blockers: status.blockers, certifiable: false },
      { status: 409 }
    );
  }

  await writeAudit(
    auth.session.user.id,
    "PRODUCTION_CERTIFIED",
    JSON.stringify({
      releaseId: parsed.data.releaseId,
      checks: status.checks.length
    })
  );

  return NextResponse.json({
    ok: true,
    certifiable: true,
    releaseId: parsed.data.releaseId,
    certifiedAt: new Date().toISOString()
  });
}
