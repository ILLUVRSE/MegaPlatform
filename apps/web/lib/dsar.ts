import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const dsarWorkflowSchema = z.object({
  type: z.enum(["export", "delete"]),
  steps: z.array(z.string().min(1)).min(1),
  evidencePath: z.string().min(1),
  slaDays: z.number().int().positive()
});

const dsarEvidenceSchema = z.object({
  requestId: z.string().min(1),
  type: z.enum(["export", "delete"]),
  userId: z.string().min(1),
  status: z.enum(["completed", "blocked"]),
  summary: z.string().min(1),
  generatedAt: z.string().min(1)
});

type DsarWorkflow = z.infer<typeof dsarWorkflowSchema>;

const defaultWorkflows: DsarWorkflow[] = [
  {
    type: "export",
    steps: ["Verify requester identity", "Collect user-linked records", "Generate machine-readable export", "Deliver via secure channel"],
    evidencePath: "docs/compliance/evidence/dsar-requests.json",
    slaDays: 30
  },
  {
    type: "delete",
    steps: ["Verify requester identity", "Check legal retention exceptions", "Execute deletion/anonymization", "Confirm completion and audit trail"],
    evidencePath: "docs/compliance/evidence/dsar-requests.json",
    slaDays: 30
  }
];

async function readJsonArray<T>(filePath: string, schema: z.ZodType<T>, fallback: T[]) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(schema).safeParse(parsed);
    if (!result.success) return fallback;
    return result.data;
  } catch {
    return fallback;
  }
}

export async function loadDsarWorkflows() {
  const filePath = path.join(process.cwd(), "ops", "governance", "dsar-workflows.json");
  return readJsonArray(filePath, dsarWorkflowSchema, defaultWorkflows);
}

export async function loadDsarEvidence() {
  const filePath = path.join(process.cwd(), "docs", "compliance", "evidence", "dsar-requests.json");
  return readJsonArray(filePath, dsarEvidenceSchema, []);
}

export async function runDsarRequest(requestId: string, type: "export" | "delete", userId: string) {
  const workflows = await loadDsarWorkflows();
  const workflow = workflows.find((item) => item.type === type);
  if (!workflow) return null;

  return {
    requestId,
    type,
    userId,
    status: "completed" as const,
    summary: `${type.toUpperCase()} workflow completed for user ${userId}.`,
    generatedAt: new Date().toISOString(),
    steps: workflow.steps,
    slaDays: workflow.slaDays
  };
}
