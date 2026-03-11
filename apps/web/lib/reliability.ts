import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const failureDrillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  target: z.enum(["queue", "storage", "realtime"]),
  cadence: z.string().min(1),
  maxDurationMin: z.number().int().positive(),
  safeModeOnly: z.boolean()
});

const failureReportSchema = z.object({
  drillId: z.string().min(1),
  target: z.enum(["queue", "storage", "realtime"]),
  status: z.enum(["pass", "fail"]),
  summary: z.string().min(1),
  generatedAt: z.string().min(1)
});

export type FailureDrill = z.infer<typeof failureDrillSchema>;
export type FailureReport = z.infer<typeof failureReportSchema>;

const defaultDrills: FailureDrill[] = [
  {
    id: "queue-backlog-drill",
    name: "Queue Backlog Drill",
    target: "queue",
    cadence: "weekly",
    maxDurationMin: 20,
    safeModeOnly: true
  },
  {
    id: "storage-upload-failure-drill",
    name: "Storage Upload Failure Drill",
    target: "storage",
    cadence: "weekly",
    maxDurationMin: 15,
    safeModeOnly: true
  },
  {
    id: "realtime-voice-drop-drill",
    name: "Realtime Voice Drop Drill",
    target: "realtime",
    cadence: "biweekly",
    maxDurationMin: 10,
    safeModeOnly: true
  }
];

async function readJsonArrayFile<T>(filePath: string, itemSchema: z.ZodType<T>, fallback: T[]) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(itemSchema).safeParse(parsed);
    if (!result.success) return fallback;
    return result.data;
  } catch {
    return fallback;
  }
}

export async function loadFailureDrills() {
  const filePath = path.join(process.cwd(), "ops", "governance", "failure-drills.json");
  return readJsonArrayFile(filePath, failureDrillSchema, defaultDrills);
}

export async function loadFailureDrillReports() {
  const filePath = path.join(process.cwd(), "ops", "logs", "failure-drills.json");
  return readJsonArrayFile(filePath, failureReportSchema, []);
}

export async function runFailureDrill(drillId: string) {
  const drills = await loadFailureDrills();
  const drill = drills.find((item) => item.id === drillId);
  if (!drill) return null;

  const report: FailureReport = {
    drillId: drill.id,
    target: drill.target,
    status: "pass",
    summary: `Simulated ${drill.target} failure drill completed in safe mode.`,
    generatedAt: new Date().toISOString()
  };

  return { drill, report };
}
