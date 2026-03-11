export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { runMicroExperiment } from "@/lib/microExperiments";

const payloadSchema = z.object({
  id: z.string().min(1),
  objectiveId: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  expectedLift: z.number()
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const result = await runMicroExperiment(parsed.data);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  const experiment = result.experiment;
  if (!experiment) return NextResponse.json({ ok: false, error: "missing_experiment" }, { status: 500 });

  await writeAudit(
    auth.session.user.id,
    "MICRO_EXPERIMENT_RUN",
    JSON.stringify({
      id: experiment.id,
      objectiveId: experiment.objectiveId,
      risk: experiment.risk
    })
  );

  return NextResponse.json({ ok: true, experiment });
}
