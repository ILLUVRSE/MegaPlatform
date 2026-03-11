import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import {
  OPS_AGENTS,
  appendTaskStep,
  blockTask,
  claimTask,
  completeTask,
  listTasks,
  pickNextTaskForAgent,
  type OpsAgent,
  type TaskRecord
} from "./taskQueue";
import { appendAgentMemory, newRunId } from "./memory";
import { assertAgentBudget, assertAgentCapability, assertSafeAction } from "./controlPlane";

const execFileAsync = promisify(execFile);

type RunSpecialistOptions = {
  repoRoot?: string;
  queueRoot?: string;
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function assertAgent(agent: string): asserts agent is OpsAgent {
  if (!OPS_AGENTS.includes(agent as OpsAgent)) {
    throw new Error(`Unknown agent: ${agent}`);
  }
}

async function maybeCreatePlaceholderBranch(repoRoot: string, task: TaskRecord) {
  const allow = task.acceptance_criteria.some((item) => item.includes("ALLOW_BRANCH_PLACEHOLDER"));
  if (!allow) return null;

  const status = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoRoot });
  if (status.stdout.trim().length > 0) {
    return "Skipped placeholder branch creation due to dirty git state.";
  }

  const branch = `ops/${task.id}`;
  await execFileAsync("git", ["checkout", "-b", branch], { cwd: repoRoot });
  return `Created placeholder branch ${branch}.`;
}

async function writeHandoff(repoRoot: string, task: TaskRecord, from: string, to: string, summary: string) {
  const handoffDir = path.join(repoRoot, "docs", "ops_brain", "handoff");
  await fs.mkdir(handoffDir, { recursive: true });
  const file = path.join(handoffDir, `${task.id}.md`);
  const body = [
    `# Handoff ${task.id}`,
    "",
    `- from: ${from}`,
    `- to: ${to}`,
    `- at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    summary,
    "",
    "## Acceptance Criteria",
    ...task.acceptance_criteria.map((item) => `- ${item}`),
    ""
  ].join("\n");
  await fs.writeFile(file, body, "utf-8");
  return path.relative(repoRoot, file);
}

async function runQualityAnalytics(task: TaskRecord, repoRoot: string, queueRoot: string) {
  await appendTaskStep(task.id, "Running `pnpm shipcheck:quick` for failure triage.", queueRoot);

  try {
    const { stdout, stderr } = await execFileAsync("pnpm", ["shipcheck:quick"], {
      cwd: repoRoot,
      timeout: 20 * 60_000
    });

    const summary = (stdout + stderr)
      .split("\n")
      .filter(Boolean)
      .slice(-8)
      .join(" | ");

    await appendTaskStep(task.id, `Shipcheck quick passed. Summary: ${summary || "pass"}`, queueRoot);

    const maybeBranchNote = await maybeCreatePlaceholderBranch(repoRoot, task);
    if (maybeBranchNote) {
      await appendTaskStep(task.id, maybeBranchNote, queueRoot);
    }

    await completeTask(task.id, "Quality triage complete: shipcheck quick is green.", [], queueRoot);
    return { ok: true, status: "done" as const };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const merged = `${err.message ?? "shipcheck quick failed"}\n${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    const summary = merged
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-12)
      .join(" | ");

    await appendTaskStep(task.id, `Shipcheck quick failure summary: ${summary}`, queueRoot);
    await appendTaskStep(
      task.id,
      "Patch plan: isolate first failing stage, reproduce locally, implement minimal fix, rerun shipcheck quick.",
      queueRoot
    );

    await blockTask(task.id, `Shipcheck failures require manual code changes. ${summary}`, queueRoot);
    return { ok: false, status: "blocked" as const };
  }
}

async function runOpsSre(task: TaskRecord, repoRoot: string, queueRoot: string) {
  const inProgress = await listTasks(queueRoot, ["in_progress"]);
  const blocked = await listTasks(queueRoot, ["blocked"]);

  const runbooksDir = path.join(repoRoot, "docs", "ops_brain", "runbooks");
  await fs.mkdir(runbooksDir, { recursive: true });
  const runbookFile = path.join(runbooksDir, "stuck-tasks.md");

  const lines = [
    `## ${new Date().toISOString()}`,
    `- Reviewed in_progress: ${inProgress.length}`,
    `- Reviewed blocked: ${blocked.length}`,
    "- Action: documented queue health snapshot and unblock guidance.",
    ""
  ].join("\n");

  await fs.appendFile(runbookFile, lines, "utf-8");
  await appendTaskStep(task.id, "Updated runbook with current stuck-task snapshot.", queueRoot);

  const artifacts = [path.relative(repoRoot, runbookFile)];
  await completeTask(task.id, "Ops/SRE investigation completed with runbook update.", artifacts, queueRoot);
  return { ok: true, status: "done" as const };
}

export async function runSpecialist(agent: OpsAgent, options: RunSpecialistOptions = {}) {
  const runId = newRunId();
  assertAgent(agent);
  const repoRoot = options.repoRoot ?? (await findRepoRoot());
  const queueRoot = options.queueRoot ?? path.join(repoRoot, "docs", "queue");

  const task = await pickNextTaskForAgent(agent, queueRoot);
  if (!task) {
    await appendAgentMemory(repoRoot, agent, {
      runId,
      actor: agent,
      ok: true,
      action: "poll_task",
      summary: "No pending task.",
      metadata: { queueRoot }
    });
    return {
      ok: true,
      message: `No pending task for ${agent}.`
    };
  }

  const allTasks = await listTasks(queueRoot);
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const actionsToday = allTasks.filter((entry) => entry.updated_at.startsWith(todayPrefix) && entry.claimed_by === agent).length;
  await assertAgentBudget(repoRoot, agent, { actionsToday });

  const claimed = await claimTask(task.id, agent, queueRoot);
  const handoffArtifact = await writeHandoff(
    repoRoot,
    claimed,
    "Director",
    agent,
    `Specialist claimed task ${task.id} and started execution.`
  );

  if (agent === "Quality/Analytics") {
    await assertAgentCapability(repoRoot, agent, "run_shipcheck_quick");
    await assertSafeAction(repoRoot, "run_shipcheck_quick");
    const result = await runQualityAnalytics(claimed, repoRoot, queueRoot);
    await appendAgentMemory(repoRoot, agent, {
      runId,
      actor: agent,
      ok: result.ok,
      action: "run_shipcheck_quick",
      summary: `Task ${task.id} ${result.status}.`,
      metadata: { taskId: task.id, handoffArtifact }
    });
    return {
      ok: result.ok,
      message: `Task ${task.id} ${result.status}`
    };
  }

  if (agent === "Ops/SRE") {
    await assertAgentCapability(repoRoot, agent, "update_runbook");
    await assertSafeAction(repoRoot, "update_runbook");
    const result = await runOpsSre(claimed, repoRoot, queueRoot);
    await appendAgentMemory(repoRoot, agent, {
      runId,
      actor: agent,
      ok: result.ok,
      action: "update_runbook",
      summary: `Task ${task.id} ${result.status}.`,
      metadata: { taskId: task.id, handoffArtifact }
    });
    return {
      ok: result.ok,
      message: `Task ${task.id} ${result.status}`
    };
  }

  await blockTask(
    claimed.id,
    `Phase 1 specialist implementation exists only for Quality/Analytics and Ops/SRE.`,
    queueRoot
  );
  await appendAgentMemory(repoRoot, agent, {
    runId,
    actor: agent,
    ok: false,
    action: "specialist_handler",
    summary: `Task ${task.id} blocked due to missing specialist behavior.`,
    metadata: { taskId: task.id, handoffArtifact }
  });

  return {
    ok: false,
    message: `Task ${task.id} blocked: specialist behavior not implemented for ${agent}.`
  };
}
