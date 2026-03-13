import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  OPS_AGENTS,
  type OpsAgent,
  createTask,
  listTasks,
  type TaskRecord
} from "./taskQueue";
import { appendAgentMemory, newRunId } from "./memory";
import { assertAgentBudget, assertAgentCapability, assertSafeAction } from "./controlPlane";

const execFileAsync = promisify(execFile);

type SenseResult = {
  gitClean: boolean;
  shipcheckOk: boolean;
  shipcheckSummary: string;
  recentLogs: string[];
  stuckInProgress: TaskRecord[];
  stuckBlocked: TaskRecord[];
};

type DirectorTaskPlan = {
  title: string;
  agent: OpsAgent;
  priority: number;
  context: string;
  acceptance_criteria: string[];
  risk_level: "low" | "medium" | "high";
  rollback_notes: string;
};

type RunDirectorOptions = {
  repoRoot?: string;
  stuckHours?: number;
  maxTasks?: number;
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

function parseRoadmapItems(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ] "))
    .map((line) => line.replace(/^- \[ \]\s*/, "").trim());
}

function parseRoadmapAgent(item: string): { agent: OpsAgent; title: string } {
  const match = item.match(/^\[(.+?)\]\s*(.+)$/);
  if (!match) {
    return { agent: "Backend", title: item };
  }
  const maybe = match[1].trim();
  const agent = OPS_AGENTS.find((entry) => entry.toLowerCase() === maybe.toLowerCase()) ?? "Backend";
  return { agent, title: match[2].trim() };
}

async function ensureOpsBrain(repoRoot: string) {
  const brainRoot = path.join(repoRoot, "docs", "ops_brain");
  const runbooksRoot = path.join(brainRoot, "runbooks");
  await fs.mkdir(runbooksRoot, { recursive: true });

  const files: Array<[string, string]> = [
    [path.join(brainRoot, "README.md"), "# Ops Brain\n\nOperational brain state for the all-day AI operator.\n"],
    [path.join(brainRoot, "roadmap.md"), "# Ops Roadmap\n\n- [ ] [Backend] Define next platform increment\n"],
    [path.join(brainRoot, "signals.md"), "# Signals Snapshot\n\nNo signals collected yet.\n"],
    [path.join(brainRoot, "decisions.md"), "# Director Decisions\n\n"]
  ];

  for (const [file, seed] of files) {
    if (!(await exists(file))) {
      await fs.writeFile(file, seed, "utf-8");
    }
  }

  const runbookIndex = path.join(runbooksRoot, "README.md");
  if (!(await exists(runbookIndex))) {
    await fs.writeFile(runbookIndex, "# Runbooks\n\n- Add runbooks for recurring incidents.\n", "utf-8");
  }

  return brainRoot;
}

async function appendDecision(repoRoot: string, note: string) {
  const file = path.join(repoRoot, "docs", "ops_brain", "decisions.md");
  const stamp = new Date().toISOString();
  await fs.appendFile(file, `## ${stamp}\n- ${note}\n\n`, "utf-8");
}

async function writeSignals(repoRoot: string, sense: SenseResult) {
  const file = path.join(repoRoot, "docs", "ops_brain", "signals.md");
  const payload = [
    "# Signals Snapshot",
    "",
    `Updated: ${new Date().toISOString()}`,
    `Git clean: ${sense.gitClean}`,
    `Shipcheck quick: ${sense.shipcheckOk ? "pass" : "fail"}`,
    `Shipcheck summary: ${sense.shipcheckSummary}`,
    "",
    "## Recent Logs",
    ...(sense.recentLogs.length > 0 ? sense.recentLogs.map((line) => `- ${line}`) : ["- (none)"]),
    "",
    "## Stuck Tasks",
    `- in_progress: ${sense.stuckInProgress.length}`,
    `- blocked: ${sense.stuckBlocked.length}`,
    ""
  ].join("\n");

  await fs.writeFile(file, payload, "utf-8");
}

async function gitStatus(repoRoot: string) {
  const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoRoot });
  return stdout.trim();
}

async function runShipcheckQuick(repoRoot: string) {
  try {
    const { stdout, stderr } = await execFileAsync("pnpm", ["shipcheck:quick"], {
      cwd: repoRoot,
      timeout: 20 * 60_000
    });
    return {
      ok: true,
      summary: (stdout + stderr).split("\n").filter(Boolean).slice(-5).join(" | ") || "shipcheck quick passed"
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const merged = `${err.message ?? "shipcheck failed"}\n${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    return {
      ok: false,
      summary: merged.split("\n").filter(Boolean).slice(-8).join(" | ")
    };
  }
}

async function readRecentLogs(repoRoot: string, limit = 5) {
  const logsDir = path.join(repoRoot, "docs", "logs");
  if (!(await exists(logsDir))) return [];
  const files = (await fs.readdir(logsDir)).filter((name) => name.endsWith(".md"));
  const withStats = await Promise.all(
    files.map(async (name) => {
      const full = path.join(logsDir, name);
      const stat = await fs.stat(full);
      return { name, mtime: stat.mtime.getTime() };
    })
  );
  return withStats
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((entry) => entry.name);
}

function isOlderThanHours(iso: string, hours: number) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  return Number.isFinite(ts) && now - ts > hours * 60 * 60 * 1000;
}

async function sense(repoRoot: string, stuckHours: number): Promise<SenseResult> {
  const dirty = await gitStatus(repoRoot);
  const gitClean = dirty.length === 0;
  if (!gitClean) {
    return {
      gitClean,
      shipcheckOk: false,
      shipcheckSummary: "Skipped because git working tree is dirty.",
      recentLogs: await readRecentLogs(repoRoot),
      stuckInProgress: [],
      stuckBlocked: []
    };
  }

  const shipcheck = await runShipcheckQuick(repoRoot);
  const inProgress = await listTasks(path.join(repoRoot, "docs", "queue"), ["in_progress"]);
  const blocked = await listTasks(path.join(repoRoot, "docs", "queue"), ["blocked"]);

  return {
    gitClean,
    shipcheckOk: shipcheck.ok,
    shipcheckSummary: shipcheck.summary,
    recentLogs: await readRecentLogs(repoRoot),
    stuckInProgress: inProgress.filter((task) => isOlderThanHours(task.updated_at, stuckHours)),
    stuckBlocked: blocked.filter((task) => isOlderThanHours(task.updated_at, stuckHours))
  };
}

async function think(repoRoot: string, senseResult: SenseResult, maxTasks: number) {
  const plans: DirectorTaskPlan[] = [];

  if (!senseResult.shipcheckOk) {
    plans.push({
      title: "Stabilize failing shipcheck and isolate flaky tests",
      agent: "Quality/Analytics",
      priority: 1,
      context: `Director detected failing quick shipcheck. Summary: ${senseResult.shipcheckSummary}`,
      acceptance_criteria: [
        "Run `pnpm shipcheck:quick` and capture failing command names.",
        "Identify at least one root-cause hypothesis for each failing stage.",
        "Document patch plan in steps_log with command-level evidence."
      ],
      risk_level: "medium",
      rollback_notes: "Revert any experimental test harness changes if they reduce signal quality."
    });
  }

  if (senseResult.stuckBlocked.length > 0) {
    plans.push({
      title: `Unblock ${senseResult.stuckBlocked.length} stale blocked task(s)`,
      agent: "Ops/SRE",
      priority: 1,
      context: "Blocked tasks exceeded staleness threshold and need unblock actions or runbook updates.",
      acceptance_criteria: [
        "Review blocked tasks older than threshold.",
        "Record unblock attempts and outcomes in steps_log.",
        "Update runbook with recurring unblock patterns."
      ],
      risk_level: "low",
      rollback_notes: "Rollback by restoring previous runbook state if edits are inaccurate."
    });
  }

  if (plans.length >= maxTasks) {
    return plans.slice(0, maxTasks);
  }

  const roadmapFile = path.join(repoRoot, "docs", "ops_brain", "roadmap.md");
  const roadmap = await fs.readFile(roadmapFile, "utf-8");
  const items = parseRoadmapItems(roadmap);

  const existing = await listTasks(path.join(repoRoot, "docs", "queue"));
  const existingTitles = new Set(existing.map((task) => task.title));

  for (const item of items) {
    if (plans.length >= maxTasks) break;
    const parsed = parseRoadmapAgent(item);
    if (existingTitles.has(parsed.title)) continue;

    plans.push({
      title: parsed.title,
      agent: parsed.agent,
      priority: 2,
      context: `Roadmap-derived item from docs/ops_brain/roadmap.md: ${item}`,
      acceptance_criteria: [
        "Define implementation approach and dependencies in steps_log.",
        "Deliver change with tests/docs updates where relevant.",
        "Run `pnpm shipcheck:quick` before marking complete."
      ],
      risk_level: "medium",
      rollback_notes: "Revert feature branch changes if acceptance criteria cannot be met safely."
    });
  }

  return plans.slice(0, maxTasks);
}

async function act(repoRoot: string, plans: DirectorTaskPlan[]) {
  const created: TaskRecord[] = [];
  await assertAgentCapability(repoRoot, "Director", "create_task");
  await assertSafeAction(repoRoot, "create_task");
  const existing = await listTasks(path.join(repoRoot, "docs", "queue"));
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const actionsToday = existing.filter((task) => task.created_at.startsWith(todayPrefix)).length;
  const budget = await assertAgentBudget(repoRoot, "Director", {
    actionsToday,
    estimatedTokens: Math.max(250, plans.length * 350)
  });
  if (budget.softFail) {
    return { created, budget };
  }

  for (const plan of plans) {
    const task = await createTask(
      {
        title: plan.title,
        agent: plan.agent,
        priority: plan.priority,
        context: plan.context,
        acceptance_criteria: plan.acceptance_criteria,
        steps_log: ["Task created by Director."],
        artifacts: [],
        risk_level: plan.risk_level,
        rollback_notes: plan.rollback_notes
      },
      path.join(repoRoot, "docs", "queue")
    );
    created.push(task);
  }
  return { created, budget };
}

export async function runDirectorCycle(options: RunDirectorOptions = {}) {
  const runId = newRunId();
  const repoRoot = options.repoRoot ?? (await findRepoRoot());
  const stuckHours = options.stuckHours ?? Number(process.env.DIRECTOR_STUCK_HOURS ?? 6);
  const maxTasks = options.maxTasks ?? Number(process.env.DIRECTOR_MAX_TASKS ?? 3);

  await ensureOpsBrain(repoRoot);

  const sensed = await sense(repoRoot, stuckHours);
  await writeSignals(repoRoot, sensed);

  if (!sensed.gitClean) {
    await appendDecision(repoRoot, "Director run aborted because git working tree is dirty.");
    await appendAgentMemory(repoRoot, "Director", {
      runId,
      actor: "Director",
      ok: false,
      action: "run_cycle",
      summary: "Aborted due to dirty git working tree.",
      metadata: { reason: "dirty_git" }
    });
    return {
      ok: false,
      reason: "dirty_git",
      createdTasks: [] as TaskRecord[]
    };
  }

  const plans = await think(repoRoot, sensed, Math.max(1, Math.min(maxTasks, 3)));
  const { created: createdTasks, budget } = await act(repoRoot, plans);

  if (budget.softFail) {
    await appendDecision(repoRoot, `Director soft-failed due to token budget threshold. ${budget.alerts[0] ?? ""}`.trim());
    await appendAgentMemory(repoRoot, "Director", {
      runId,
      actor: "Director",
      ok: false,
      action: "run_cycle",
      summary: "Soft-failed due to daily token budget threshold.",
      tokenUsage: 0,
      metadata: { reason: "token_budget_threshold", budget }
    });
    return {
      ok: false,
      reason: "token_budget_threshold",
      createdTasks: [] as TaskRecord[]
    };
  }

  await appendDecision(
    repoRoot,
    `Director sensed shipcheck=${sensed.shipcheckOk ? "pass" : "fail"}; created ${createdTasks.length} task(s).`
  );
  await appendAgentMemory(repoRoot, "Director", {
    runId,
      actor: "Director",
      ok: true,
      action: "run_cycle",
      summary: `Created ${createdTasks.length} task(s).`,
      tokenUsage: Math.max(250, plans.length * 350),
      metadata: { shipcheckOk: sensed.shipcheckOk, createdTasks: createdTasks.length, budget }
    });

  return {
    ok: true,
    reason: "completed",
    createdTasks
  };
}
