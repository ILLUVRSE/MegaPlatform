export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask } from "@illuvrse/agent-manager";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { generateHypotheses } from "@/lib/hypothesisGenerator";

const payloadSchema = z.object({
  anomalies: z.array(
    z.object({
      signal: z.string().min(1),
      deltaRatio: z.number()
    })
  )
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const generated = await generateHypotheses(parsed.data.anomalies);
  const tasks: Array<{ id: string; title: string; risk: "low" | "medium" | "high"; confidence: number }> = [];
  for (const hypothesis of generated.hypotheses) {
    const task = await createTask({
      title: `Hypothesis: ${hypothesis.signal}`,
      agent: "Quality/Analytics",
      priority: hypothesis.risk === "high" ? 1 : hypothesis.risk === "medium" ? 2 : 3,
      context: `${hypothesis.summary} confidence=${hypothesis.confidence.toFixed(2)} risk=${hypothesis.risk}`,
      acceptance_criteria: [
        "Validate anomaly source with telemetry evidence",
        "Propose one low-risk experiment",
        "Document expected upside/downside"
      ],
      steps_log: ["Hypothesis auto-generated from anomaly telemetry"],
      artifacts: [],
      risk_level: hypothesis.risk,
      rollback_notes: "No production changes without approval"
    });
    tasks.push({ id: task.id, title: task.title, risk: hypothesis.risk, confidence: hypothesis.confidence });
  }

  await writeAudit(
    auth.session.user.id,
    "HYPOTHESIS_GENERATED",
    JSON.stringify({
      generated: tasks.length
    })
  );

  return NextResponse.json({
    ok: true,
    policy: generated.policy,
    tasks
  });
}
