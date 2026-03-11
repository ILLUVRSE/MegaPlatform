import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const objectiveSchema = z.object({
  id: z.string().min(1),
  scope: z.string().min(1),
  owner: z.string().min(1),
  metricKey: z.string().min(1),
  target: z.number()
});

const defaultObjectives = [
  { id: "global_reliability", scope: "global", owner: "Ops/SRE", metricKey: "live_channel_healthy_ratio", target: 0.95 }
];

export async function loadObjectives() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "objectives.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(objectiveSchema).safeParse(parsed);
    if (!result.success) return defaultObjectives;
    return result.data;
  } catch {
    return defaultObjectives;
  }
}
