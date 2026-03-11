import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

export const OPS_ROLES = [
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

export type OpsRole = (typeof OPS_ROLES)[number];

export type OpsSections = Record<OpsRole, string[]>;

export type OpsEnqueueResult = {
  enqueued: number;
  blocked: number;
  total: number;
};

export type OpsTaskRow = {
  id: string;
  role: string;
  text: string;
  status: string;
  createdAt: string;
  createdAtTs: number;
  branch?: string | null;
};

export type OpsLogRow = {
  name: string;
  updatedAt: string;
  updatedAtTs: number;
  preview: string;
};

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function findOpsRoot() {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(current, "ops");
    if (await pathExists(path.join(candidate, "briefing.md"))) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export async function readBriefing(opsRoot: string) {
  const file = path.join(opsRoot, "briefing.md");
  if (!(await pathExists(file))) return "";
  return fs.readFile(file, "utf-8");
}

export function parseBriefing(content: string): OpsSections {
  const sections = Object.fromEntries(OPS_ROLES.map((role) => [role, []])) as unknown as OpsSections;
  let currentRole: OpsRole | null = null;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      const role = line.slice(1, -1).trim() as OpsRole;
      currentRole = OPS_ROLES.includes(role) ? role : null;
      continue;
    }
    if (line.startsWith("-") && currentRole) {
      const text = line.replace(/^[-\s]+/, "").trim();
      if (text) sections[currentRole].push(text);
    }
  }
  return sections;
}

export function buildBriefing(sections: OpsSections, notes: string, destructiveOk: boolean) {
  const lines: string[] = ["# Daily Briefing"];
  for (const role of OPS_ROLES) {
    lines.push("");
    lines.push(`[${role}]`);
    const tasks = sections[role] ?? [];
    if (tasks.length === 0) {
      lines.push("-");
    } else {
      for (const task of tasks) lines.push(`- ${task}`);
    }
  }
  lines.push("");
  lines.push("# Notes");
  const noteLines = notes.trim() ? notes.trim().split("\n") : [];
  if (destructiveOk) {
    noteLines.unshift("[DESTRUCTIVE-OK]");
  }
  if (noteLines.length === 0) {
    lines.push("-");
  } else {
    for (const note of noteLines) lines.push(note.startsWith("-") ? note : `- ${note}`);
  }
  lines.push("");
  return lines.join("\n");
}

function taskFingerprint(role: string, text: string) {
  return crypto.createHash("sha256").update(`${role}::${text}`).digest("hex");
}

export async function writeBriefing(opsRoot: string, content: string) {
  const file = path.join(opsRoot, "briefing.md");
  await fs.writeFile(file, content, "utf-8");
}

export async function enqueueTasks(
  opsRoot: string,
  sections: OpsSections,
  destructiveOk: boolean
): Promise<OpsEnqueueResult> {
  const queueDir = path.join(opsRoot, "queue");
  const pendingDir = path.join(queueDir, "pending");
  const blockedDir = path.join(queueDir, "blocked");
  const indexFile = path.join(queueDir, "index.json");

  await fs.mkdir(pendingDir, { recursive: true });
  await fs.mkdir(blockedDir, { recursive: true });

  const index: Record<string, { id: string; role: string; text: string; created_at: string }> =
    (await pathExists(indexFile)) ? JSON.parse(await fs.readFile(indexFile, "utf-8")) : {};

  let enqueued = 0;
  let blocked = 0;
  const now = new Date();

  for (const role of OPS_ROLES) {
    for (const text of sections[role] ?? []) {
      if (!text) continue;
      const fingerprint = taskFingerprint(role, text);
      if (index[fingerprint]) continue;

      const created_at = now.toISOString();
      const task_id = `${created_at.replace(/[-:]/g, "").replace(".", "")}-${fingerprint.slice(0, 8)}`;
      const needsBlock = text.includes("[DESTRUCTIVE]") && !destructiveOk;
      const status = needsBlock ? "blocked" : "pending";
      const payload = {
        id: task_id,
        role,
        text,
        created_at,
        status
      };

      const outDir = needsBlock ? blockedDir : pendingDir;
      await fs.writeFile(path.join(outDir, `${task_id}.json`), JSON.stringify(payload, null, 2), "utf-8");

      index[fingerprint] = { id: task_id, role, text, created_at };
      if (needsBlock) blocked += 1;
      else enqueued += 1;
    }
  }

  await fs.writeFile(indexFile, JSON.stringify(index, null, 2), "utf-8");

  return {
    enqueued,
    blocked,
    total: enqueued + blocked
  };
}

const STATUS_DIRS = ["pending", "in_progress", "done", "blocked"] as const;

export async function readTasks(opsRoot: string): Promise<OpsTaskRow[]> {
  const rows: OpsTaskRow[] = [];
  for (const status of STATUS_DIRS) {
    const dir = path.join(opsRoot, "queue", status);
    if (!(await pathExists(dir))) continue;
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const payload = JSON.parse(await fs.readFile(path.join(dir, file), "utf-8"));
      const createdAtTs = payload.created_at ? new Date(payload.created_at).getTime() : 0;
      const createdAt = payload.created_at ? new Date(payload.created_at).toLocaleString() : "-";
      rows.push({
        id: payload.id,
        role: payload.role,
        text: payload.text,
        status: payload.status ?? status,
        createdAt,
        createdAtTs,
        branch: payload.branch ?? null
      });
    }
  }
  return rows.sort((a, b) => b.createdAtTs - a.createdAtTs);
}

export async function readLogs(opsRoot: string): Promise<OpsLogRow[]> {
  const logsDir = path.join(opsRoot, "logs");
  if (!(await pathExists(logsDir))) return [];
  const files = (await fs.readdir(logsDir)).filter((file) => file.endsWith(".md"));
  const rows: OpsLogRow[] = [];
  for (const file of files) {
    const fullPath = path.join(logsDir, file);
    const stat = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, "utf-8");
    const preview =
      content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)[1] ?? "(empty)";
    rows.push({
      name: file,
      updatedAt: stat.mtime.toLocaleString(),
      updatedAtTs: stat.mtime.getTime(),
      preview
    });
  }
  return rows.sort((a, b) => b.updatedAtTs - a.updatedAtTs).slice(0, 20);
}

export async function moveTask(opsRoot: string, taskId: string, nextStatus: string) {
  if (!STATUS_DIRS.includes(nextStatus as typeof STATUS_DIRS[number])) {
    throw new Error("invalid status");
  }
  const queueDir = path.join(opsRoot, "queue");
  const targetDir = path.join(queueDir, nextStatus);
  await fs.mkdir(targetDir, { recursive: true });

  for (const status of STATUS_DIRS) {
    const file = path.join(queueDir, status, `${taskId}.json`);
    if (await pathExists(file)) {
      const payload = JSON.parse(await fs.readFile(file, "utf-8"));
      payload.status = nextStatus;
      await fs.writeFile(path.join(targetDir, `${taskId}.json`), JSON.stringify(payload, null, 2), "utf-8");
      if (path.join(queueDir, status) !== targetDir) {
        await fs.unlink(file);
      }
      return payload;
    }
  }

  throw new Error("task not found");
}
