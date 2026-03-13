import { promises as fs } from "fs";
import path from "path";
import type { OpsAgent } from "./taskQueue";
import { getAgentDailyUsage } from "./memory";

type Capability = { agent: string; action: string; requiresApproval: boolean };
type SafeAction = { action: string; risk: "low" | "medium" | "high"; blocked: boolean };
type ApprovalCheckpoint = { action: string; approvalRequired: boolean; owner: string };

type Budget = { agent: string; window: string; maxActions: number; maxTokenBudget: number };
type BudgetAlert = {
  at: string;
  agent: string;
  status: "warning" | "soft_fail";
  message: string;
  usage: {
    actionsToday: number;
    tokensToday: number;
    projectedTokens: number;
    maxActions: number;
    maxTokenBudget: number;
  };
};

export type AgentBudgetResult = {
  ok: boolean;
  softFail: boolean;
  usage: {
    actionsToday: number;
    tokensToday: number;
    projectedTokens: number;
    maxActions: number;
    maxTokenBudget: number;
  };
  alerts: string[];
};

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

export async function assertAgentBudget(
  repoRoot: string,
  agent: OpsAgent | "Director",
  usage: { actionsToday: number; estimatedTokens?: number }
) {
  const budgets = await readJson<Budget[]>(repoRoot, "ops/governance/agent-budgets.json");
  const budget = budgets.find((entry) => entry.agent === agent);
  if (!budget) {
    return {
      ok: true,
      softFail: false,
      usage: {
        actionsToday: usage.actionsToday,
        tokensToday: 0,
        projectedTokens: 0,
        maxActions: Number.POSITIVE_INFINITY,
        maxTokenBudget: Number.POSITIVE_INFINITY
      },
      alerts: []
    } satisfies AgentBudgetResult;
  }
  if (usage.actionsToday >= budget.maxActions) {
    throw new Error(`Budget exceeded for ${agent}: actionsToday=${usage.actionsToday}, max=${budget.maxActions}`);
  }

  const day = new Date().toISOString().slice(0, 10);
  const dailyUsage = await getAgentDailyUsage(repoRoot, agent, day);
  const estimatedTokens = Math.max(0, Number(usage.estimatedTokens ?? 0));
  const projectedTokens = dailyUsage.tokens + estimatedTokens;
  const alerts: string[] = [];

  if (projectedTokens >= budget.maxTokenBudget * 0.8) {
    alerts.push(
      projectedTokens >= budget.maxTokenBudget
        ? `Token budget reached for ${agent}: projected=${projectedTokens}, max=${budget.maxTokenBudget}`
        : `Token budget warning for ${agent}: projected=${projectedTokens}, max=${budget.maxTokenBudget}`
    );
  }

  if (alerts.length > 0) {
    const alertsDir = path.join(repoRoot, "docs", "ops_brain", "alerts");
    await fs.mkdir(alertsDir, { recursive: true });
    const alert: BudgetAlert = {
      at: new Date().toISOString(),
      agent,
      status: projectedTokens >= budget.maxTokenBudget ? "soft_fail" : "warning",
      message: alerts[0],
      usage: {
        actionsToday: usage.actionsToday,
        tokensToday: dailyUsage.tokens,
        projectedTokens,
        maxActions: budget.maxActions,
        maxTokenBudget: budget.maxTokenBudget
      }
    };
    await fs.appendFile(path.join(alertsDir, "agent-cost-controls.jsonl"), `${JSON.stringify(alert)}\n`, "utf-8");
  }

  return {
    ok: projectedTokens < budget.maxTokenBudget,
    softFail: projectedTokens >= budget.maxTokenBudget,
    usage: {
      actionsToday: usage.actionsToday,
      tokensToday: dailyUsage.tokens,
      projectedTokens,
      maxActions: budget.maxActions,
      maxTokenBudget: budget.maxTokenBudget
    },
    alerts
  } satisfies AgentBudgetResult;
}
