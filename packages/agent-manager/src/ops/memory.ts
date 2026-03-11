import { promises as fs } from "fs";
import path from "path";

export type AgentMemoryRecord = {
  runId: string;
  actor: string;
  at: string;
  ok: boolean;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

function runId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newRunId() {
  return runId();
}

export async function appendAgentMemory(repoRoot: string, actor: string, record: Omit<AgentMemoryRecord, "at">) {
  const memoryDir = path.join(repoRoot, "docs", "ops_brain", "memory");
  await fs.mkdir(memoryDir, { recursive: true });
  const file = path.join(memoryDir, `${actor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jsonl`);

  const row: AgentMemoryRecord = {
    ...record,
    at: new Date().toISOString()
  };

  await fs.appendFile(file, `${JSON.stringify(row)}\n`, "utf-8");
  return file;
}
