export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { buildBriefing, findOpsRoot, type OpsSections, writeBriefing } from "@/lib/ops";
import { opsBriefingPayloadSchema } from "@/lib/opsPayload";
import { writeAudit } from "@/lib/audit";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

type Payload = {
  sections: OpsSections;
  notes?: string;
  destructiveOk?: boolean;
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `admin:ops-briefing:${resolveClientKey(req, auth.session.user.id)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const parsed = opsBriefingPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const body = {
    sections: parsed.data.sections as unknown as OpsSections,
    notes: parsed.data.notes,
    destructiveOk: parsed.data.destructiveOk
  } satisfies Payload;
  const opsRoot = await findOpsRoot();
  if (!opsRoot) {
    return NextResponse.json({ error: "ops root not found" }, { status: 404 });
  }

  const content = buildBriefing(
    body.sections,
    body.notes ?? "",
    Boolean(body.destructiveOk)
  );
  await writeBriefing(opsRoot, content);
  await writeAudit(
    auth.session.user.id,
    "OPS_BRIEFING_SAVED",
    JSON.stringify({
      destructiveOk: Boolean(body.destructiveOk),
      taskCounts: Object.fromEntries(Object.entries(body.sections).map(([role, tasks]) => [role, tasks.length]))
    })
  );

  return NextResponse.json({ ok: true });
}
