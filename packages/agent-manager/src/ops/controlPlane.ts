import { promises as fs } from "fs";
import path from "path";
import type { OpsAgent } from "./taskQueue";

type Capability = { agent: string; action: string; requiresApproval: boolean };
type SafeAction = { action: string; risk: "low" | "medium" | "high"; blocked: boolean };
type ApprovalCheckpoint = { action: string; approvalRequired: boolean; owner: string };

type Budget = { agent: string; window: string; maxActions: number; maxTokenBudget: number };

async function readJson<T>(repoRoot: string, relativePath: string): Promise<T> {
  const full = path.join(repoRoot, relativePath);
  const content = await fs.readFile(full, "utf-8");
  return JSON.parse(content) as T;
}

export async function assertAgentCapability(repoRoot: string, agent: OpsAgent | "Director", action: string) {
  const capabilities = await readJson<Capability[]>(repoRoot, "ops/governance/agent-capabilities.json");
  const match = capabilities.find((entry) => entry.agent === agent && entry.action === action);
  if (!match) {
    throw new Error(`Capability denied: ${agent} cannot perform action '${action}'`);
  }
  return match;
}

export async function assertSafeAction(repoRoot: string, action: string) {
  const actions = await readJson<SafeAction[]>(repoRoot, "ops/governance/agent-safe-actions.json");
  const match = actions.find((entry) => entry.action === action);
  if (!match) {
    throw new Error(`Safe-action policy missing for action '${action}'`);
  }
  if (match.blocked) {
    throw new Error(`Action blocked by policy: '${action}'`);
  }
  return match;
}

export async function assertApprovalIfRequired(repoRoot: string, action: string) {
  const checkpoints = await readJson<ApprovalCheckpoint[]>(repoRoot, "ops/governance/agent-approval-checkpoints.json");
  const checkpoint = checkpoints.find((entry) => entry.action === action);
  if (!checkpoint || !checkpoint.approvalRequired) return;

  const approvalsPath = path.join(repoRoot, "docs", "ops_brain", "approvals.json");
  try {
    const approved = JSON.parse(await fs.readFile(approvalsPath, "utf-8")) as Array<{ action: string; approved: boolean }>;
    const match = approved.find((entry) => entry.action === action && entry.approved === true);
    if (!match) {
      throw new Error(`Approval required for '${action}' by ${checkpoint.owner}`);
    }
  } catch {
    throw new Error(`Approval required for '${action}' by ${checkpoint.owner}`);
  }
}

export async function assertAgentBudget(repoRoot: string, agent: OpsAgent | "Director", usage: { actionsToday: number }) {
  const budgets = await readJson<Budget[]>(repoRoot, "ops/governance/agent-budgets.json");
  const budget = budgets.find((entry) => entry.agent === agent);
  if (!budget) return;
  if (usage.actionsToday >= budget.maxActions) {
    throw new Error(`Budget exceeded for ${agent}: actionsToday=${usage.actionsToday}, max=${budget.maxActions}`);
  }
}
