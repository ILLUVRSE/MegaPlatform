import { promises as fs } from "fs";
import path from "path";
import type { AgentMemoryRecord } from "./memory";

export async function replayAgentRun(repoRoot: string, actor: string, runId: string) {
  const file = path.join(repoRoot, "docs", "ops_brain", "memory", `${actor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jsonl`);
  const content = await fs.readFile(file, "utf-8");
  const rows = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AgentMemoryRecord)
    .filter((row) => row.runId === runId);

  return {
    actor,
    runId,
    steps: rows
  };
}
