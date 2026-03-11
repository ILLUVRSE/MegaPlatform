import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export const OPS_AGENTS = [
  "Content Ops",
  "Feed & Moderation",
  "Party Ops",
  "Live Scheduler",
  "Studio Pipeline",
  "Quality/Analytics",
  "Customer Support",
  "Ops/SRE",
  "Frontend",
  "Backend",
  "Infra"
] as const;

export type OpsAgent = (typeof OPS_AGENTS)[number];

export const TASK_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type RiskLevel = "low" | "medium" | "high";

export type TaskRecord = {
  id: string;
  title: string;
  agent: OpsAgent;
  priority: number;
  created_at: string;
  updated_at: string;
  status: TaskStatus;
  context: string;
  acceptance_criteria: string[];
  steps_log: string[];
  artifacts: string[];
  risk_level: RiskLevel;
  rollback_notes: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
};

export type CreateTaskInput = Omit<
  TaskRecord,
  "id" | "created_at" | "updated_at" | "status"
> & {
  status?: TaskStatus;
};

export type TaskPaths = {
  root: string;
  queueRoot: string;
  statusDirs: Record<TaskStatus, string>;
};

const FRONTMATTER_START = "---";
const DEFAULT_PRIORITY = 3;

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
    const marker = path.join(current, "pnpm-workspace.yaml");
    if (await exists(marker)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export async function resolveTaskPaths(queueRoot?: string): Promise<TaskPaths> {
  const root = await findRepoRoot();
  const resolvedQueueRoot = queueRoot ?? path.join(root, "docs", "queue");
  return {
    root,
    queueRoot: resolvedQueueRoot,
    statusDirs: {
      pending: path.join(resolvedQueueRoot, "pending"),
      in_progress: path.join(resolvedQueueRoot, "in_progress"),
      done: path.join(resolvedQueueRoot, "done"),
      blocked: path.join(resolvedQueueRoot, "blocked")
    }
  };
}

async function ensureDirs(paths: TaskPaths) {
  await Promise.all(
    TASK_STATUSES.map((status) => fs.mkdir(paths.statusDirs[status], { recursive: true }))
  );
}

function assertAgent(agent: string): asserts agent is OpsAgent {
  if (!OPS_AGENTS.includes(agent as OpsAgent)) {
    throw new Error(`Invalid agent: ${agent}`);
  }
}

function assertStatus(status: string): asserts status is TaskStatus {
  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function compactTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(".", "").replace("Z", "");
}

async function generateTaskId(paths: TaskPaths) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const ts = compactTimestamp(new Date());
    const suffix = randomBytes(3).toString("hex");
    const id = `${ts}-${suffix}`;
    const taken = await findTaskFile(id, paths);
    if (!taken) return id;
  }
  throw new Error("Unable to generate unique task id");
}

function normalizeTask(task: TaskRecord): TaskRecord {
  return {
    ...task,
    priority: Number.isFinite(task.priority) ? Math.max(1, Math.min(5, Math.round(task.priority))) : DEFAULT_PRIORITY,
    acceptance_criteria: task.acceptance_criteria ?? [],
    steps_log: task.steps_log ?? [],
    artifacts: task.artifacts ?? [],
    context: task.context ?? "",
    rollback_notes: task.rollback_notes ?? "",
    claimed_by: task.claimed_by ?? null,
    claimed_at: task.claimed_at ?? null
  };
}

function parseListSection(block: string) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s*(\[[ xX]\])?\s*/, "").trim())
    .filter(Boolean);
}

function parseFrontmatter(content: string) {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== FRONTMATTER_START) {
    throw new Error("Task frontmatter missing");
  }

  const data: Record<string, unknown> = {};
  let idx = 1;
  for (; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    if (line === FRONTMATTER_START) {
      idx += 1;
      break;
    }
    if (!line) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const raw = line.slice(sep + 1).trim();

    if (raw === "null" || raw === "") data[key] = null;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) data[key] = Number(raw);
    else if (raw === "true" || raw === "false") data[key] = raw === "true";
    else if ((raw.startsWith("\"") && raw.endsWith("\"")) || (raw.startsWith("'") && raw.endsWith("'"))) {
      data[key] = raw.slice(1, -1);
    } else {
      data[key] = raw;
    }
  }

  return {
    data,
    body: lines.slice(idx).join("\n")
  };
}

function section(body: string, heading: string) {
  const start = body.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const rest = body.slice(start + `## ${heading}`.length);
  const nextIdx = rest.search(/\n##\s+/);
  return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).trim();
}

export function parseTaskMarkdown(content: string): TaskRecord {
  const { data, body } = parseFrontmatter(content);

  assertAgent(String(data.agent));
  assertStatus(String(data.status));

  const task: TaskRecord = {
    id: String(data.id),
    title: String(data.title),
    agent: data.agent as OpsAgent,
    priority: Number(data.priority ?? DEFAULT_PRIORITY),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
    status: data.status as TaskStatus,
    context: section(body, "Context"),
    acceptance_criteria: parseListSection(section(body, "Acceptance Criteria")),
    steps_log: parseListSection(section(body, "Steps Log")),
    artifacts: parseListSection(section(body, "Artifacts")),
    risk_level: (String(data.risk_level ?? "medium") as RiskLevel),
    rollback_notes: section(body, "Rollback Notes"),
    claimed_by: data.claimed_by ? String(data.claimed_by) : null,
    claimed_at: data.claimed_at ? String(data.claimed_at) : null
  };

  return normalizeTask(task);
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

export function formatTaskMarkdown(input: TaskRecord) {
  const task = normalizeTask(input);
  const lines = [
    FRONTMATTER_START,
    `id: ${stringifyValue(task.id)}`,
    `title: ${stringifyValue(task.title)}`,
    `agent: ${stringifyValue(task.agent)}`,
    `priority: ${task.priority}`,
    `created_at: ${stringifyValue(task.created_at)}`,
    `updated_at: ${stringifyValue(task.updated_at)}`,
    `status: ${stringifyValue(task.status)}`,
    `claimed_by: ${stringifyValue(task.claimed_by)}`,
    `claimed_at: ${stringifyValue(task.claimed_at)}`,
    `risk_level: ${stringifyValue(task.risk_level)}`,
    FRONTMATTER_START,
    "",
    "## Context",
    task.context || "(none)",
    "",
    "## Acceptance Criteria",
    ...(task.acceptance_criteria.length > 0
      ? task.acceptance_criteria.map((item) => `- [ ] ${item}`)
      : ["- [ ] (none)"]),
    "",
    "## Steps Log",
    ...(task.steps_log.length > 0 ? task.steps_log.map((item) => `- ${item}`) : ["- (empty)"]),
    "",
    "## Artifacts",
    ...(task.artifacts.length > 0 ? task.artifacts.map((item) => `- ${item}`) : ["- (none)"]),
    "",
    "## Rollback Notes",
    task.rollback_notes || "(none)",
    ""
  ];

  return lines.join("\n");
}

async function writeSafe(filePath: string, content: string) {
  const tmp = `${filePath}.tmp-${randomBytes(4).toString("hex")}`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, filePath);
}

async function findTaskFile(taskId: string, paths: TaskPaths) {
  for (const status of TASK_STATUSES) {
    const filePath = path.join(paths.statusDirs[status], `${taskId}.task.md`);
    if (await exists(filePath)) {
      return { status, filePath };
    }
  }
  return null;
}

async function writeTask(task: TaskRecord, paths: TaskPaths) {
  const target = path.join(paths.statusDirs[task.status], `${task.id}.task.md`);
  await writeSafe(target, formatTaskMarkdown(task));
  return target;
}

export async function createTask(input: CreateTaskInput, queueRoot?: string): Promise<TaskRecord> {
  assertAgent(input.agent);
  const paths = await resolveTaskPaths(queueRoot);
  await ensureDirs(paths);

  const now = nowIso();
  const task: TaskRecord = normalizeTask({
    id: await generateTaskId(paths),
    title: input.title,
    agent: input.agent,
    priority: input.priority ?? DEFAULT_PRIORITY,
    created_at: now,
    updated_at: now,
    status: input.status ?? "pending",
    context: input.context,
    acceptance_criteria: input.acceptance_criteria,
    steps_log: input.steps_log,
    artifacts: input.artifacts,
    risk_level: input.risk_level,
    rollback_notes: input.rollback_notes,
    claimed_by: null,
    claimed_at: null
  });

  await writeTask(task, paths);
  return task;
}

export async function readTask(taskId: string, queueRoot?: string): Promise<TaskRecord | null> {
  const paths = await resolveTaskPaths(queueRoot);
  const located = await findTaskFile(taskId, paths);
  if (!located) return null;
  const content = await fs.readFile(located.filePath, "utf-8");
  return parseTaskMarkdown(content);
}

export async function listTasks(queueRoot?: string, statuses?: TaskStatus[]): Promise<TaskRecord[]> {
  const paths = await resolveTaskPaths(queueRoot);
  await ensureDirs(paths);
  const selected = statuses && statuses.length > 0 ? statuses : TASK_STATUSES;
  const rows: TaskRecord[] = [];

  for (const status of selected) {
    const files = await fs.readdir(paths.statusDirs[status]);
    const taskFiles = files.filter((name) => name.endsWith(".task.md")).sort();
    for (const name of taskFiles) {
      const content = await fs.readFile(path.join(paths.statusDirs[status], name), "utf-8");
      rows.push(parseTaskMarkdown(content));
    }
  }

  return rows.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

async function moveTask(taskId: string, nextStatus: TaskStatus, mutate?: (task: TaskRecord) => TaskRecord, queueRoot?: string) {
  const paths = await resolveTaskPaths(queueRoot);
  await ensureDirs(paths);

  const located = await findTaskFile(taskId, paths);
  if (!located) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const content = await fs.readFile(located.filePath, "utf-8");
  const parsed = parseTaskMarkdown(content);

  const base: TaskRecord = {
    ...parsed,
    status: nextStatus,
    updated_at: nowIso()
  };

  const task = normalizeTask(mutate ? mutate(base) : base);
  const nextFile = path.join(paths.statusDirs[nextStatus], `${task.id}.task.md`);

  await writeSafe(nextFile, formatTaskMarkdown(task));
  if (nextFile !== located.filePath) {
    await fs.unlink(located.filePath);
  }

  return task;
}

export async function claimTask(taskId: string, agent: OpsAgent, queueRoot?: string) {
  assertAgent(agent);
  return moveTask(
    taskId,
    "in_progress",
    (task) => {
      if (task.agent !== agent) {
        throw new Error(`Task ${task.id} is assigned to ${task.agent}, not ${agent}`);
      }
      return {
        ...task,
        claimed_by: agent,
        claimed_at: nowIso(),
        steps_log: [...task.steps_log, `${nowIso()} Claimed by ${agent}`]
      };
    },
    queueRoot
  );
}

export async function completeTask(
  taskId: string,
  summary: string,
  artifacts: string[] = [],
  queueRoot?: string
) {
  return moveTask(
    taskId,
    "done",
    (task) => ({
      ...task,
      artifacts: [...task.artifacts, ...artifacts],
      steps_log: [...task.steps_log, `${nowIso()} Completed: ${summary}`]
    }),
    queueRoot
  );
}

export async function blockTask(taskId: string, reason: string, queueRoot?: string) {
  return moveTask(
    taskId,
    "blocked",
    (task) => ({
      ...task,
      steps_log: [...task.steps_log, `${nowIso()} Blocked: ${reason}`]
    }),
    queueRoot
  );
}

export async function appendTaskStep(taskId: string, step: string, queueRoot?: string) {
  const task = await readTask(taskId, queueRoot);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return moveTask(
    taskId,
    task.status,
    (entry) => ({
      ...entry,
      steps_log: [...entry.steps_log, `${nowIso()} ${step}`]
    }),
    queueRoot
  );
}

export async function pickNextTaskForAgent(agent: OpsAgent, queueRoot?: string) {
  const tasks = await listTasks(queueRoot, ["pending"]);
  return tasks.find((task) => task.agent === agent) ?? null;
}
