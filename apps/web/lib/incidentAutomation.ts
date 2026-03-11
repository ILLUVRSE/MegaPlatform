import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const incidentActionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  severity: z.enum(["SEV-1", "SEV-2", "SEV-3"]),
  safe: z.boolean(),
  steps: z.array(z.string().min(1)).min(1)
});

export type IncidentAction = z.infer<typeof incidentActionSchema>;

const defaultActions: IncidentAction[] = [
  {
    id: "pause-risky-retries",
    name: "Pause Risky Retries",
    severity: "SEV-2",
    safe: true,
    steps: ["Pause affected retry workers", "Confirm queue growth has stopped", "Capture queue snapshot for audit"]
  },
  {
    id: "degrade-live-features",
    name: "Degrade Live Feature Toggles",
    severity: "SEV-1",
    safe: true,
    steps: ["Disable optional realtime overlays", "Keep playback path active", "Verify channel health warnings render"]
  },
  {
    id: "freeze-publish",
    name: "Freeze Studio Publish",
    severity: "SEV-1",
    safe: true,
    steps: ["Block new publish transitions", "Allow in-flight finalization only", "Notify ops queue owners"]
  }
];

async function readActionsFile() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "incident-automation-actions.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(incidentActionSchema).safeParse(parsed);
    if (!result.success) return defaultActions;
    return result.data;
  } catch {
    return defaultActions;
  }
}

export async function loadIncidentAutomationActions() {
  return readActionsFile();
}

export async function runIncidentAutomation(actionId: string, severity: "SEV-1" | "SEV-2" | "SEV-3") {
  const actions = await readActionsFile();
  const action = actions.find((item) => item.id === actionId);
  if (!action) return null;

  const allowBySeverity =
    severity === "SEV-1" ||
    (severity === "SEV-2" && action.severity !== "SEV-1") ||
    (severity === "SEV-3" && action.severity === "SEV-3");
  if (!allowBySeverity) return { action, denied: true as const };

  return {
    action,
    denied: false as const,
    execution: {
      status: "triggered",
      summary: `Incident action '${action.id}' triggered under ${severity}.`,
      steps: action.steps
    }
  };
}
