import { promises as fs } from "fs";
import path from "path";

export type AgentMemoryRecord = {
  runId: string;
  actor: string;
  namespace: string;
  sequence: number;
  at: string;
  expiresAt?: string;
  ok: boolean;
  action: string;
  summary: string;
  tokenUsage?: number;
  metadata?: Record<string, unknown>;
};

function runId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newRunId() {
  return runId();
}

export type AppendAgentMemoryOptions = {
  namespace?: string;
  ttlMs?: number;
  maxEntries?: number;
  now?: Date;
};

export type ListAgentMemoryOptions = {
  namespace?: string;
  namespaces?: string[];
  runId?: string;
  last?: number;
  includeExpired?: boolean;
  maxEntries?: number;
  now?: Date;
};

export type AgentDailyUsage = {
  actor: string;
  day: string;
  interactions: number;
  tokens: number;
};

const DEFAULT_NAMESPACE = "interactions";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

function normalizeActor(actor: string) {
  return actor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function namespaceFile(repoRoot: string, actor: string, namespace: string) {
  return path.join(repoRoot, "docs", "ops_brain", "memory", normalizeActor(actor), `${namespace}.jsonl`);
}

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function sortRecords(records: AgentMemoryRecord[]) {
  return [...records].sort((left, right) => {
    const atDiff = new Date(left.at).getTime() - new Date(right.at).getTime();
    if (atDiff !== 0) return atDiff;
    const sequenceDiff = left.sequence - right.sequence;
    if (sequenceDiff !== 0) return sequenceDiff;
    return left.runId.localeCompare(right.runId);
  });
}

async function readNamespaceRecords(
  repoRoot: string,
  actor: string,
  namespace: string,
  options: { includeExpired?: boolean; maxEntries?: number; now?: Date } = {}
) {
  const file = namespaceFile(repoRoot, actor, namespace);
  const maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  const now = options.now ?? new Date();

  if (!(await exists(file))) {
    return { file, records: [] as AgentMemoryRecord[] };
  }

  const content = await fs.readFile(file, "utf-8");
  const parsed = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AgentMemoryRecord)
    .filter((record) => record.actor === actor && record.namespace === namespace);

  const active = parsed.filter((record) => {
    if (options.includeExpired) return true;
    if (!record.expiresAt) return true;
    return new Date(record.expiresAt).getTime() > now.getTime();
  });

  const retained = sortRecords(active).slice(-maxEntries);
  const shouldRewrite = retained.length !== parsed.length || retained.some((record, index) => record !== parsed[index]);

  if (shouldRewrite) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const body = retained.map((record) => JSON.stringify(record)).join("\n");
    await fs.writeFile(file, body.length > 0 ? `${body}\n` : "", "utf-8");
  }

  return { file, records: retained };
}

async function listNamespaces(repoRoot: string, actor: string) {
  const actorDir = path.join(repoRoot, "docs", "ops_brain", "memory", normalizeActor(actor));
  if (!(await exists(actorDir))) return [];
  const entries = await fs.readdir(actorDir);
  return entries.filter((entry) => entry.endsWith(".jsonl")).map((entry) => entry.replace(/\.jsonl$/, ""));
}

export async function listAgentMemory(repoRoot: string, actor: string, options: ListAgentMemoryOptions = {}) {
  const namespaces = options.namespaces ?? (options.namespace ? [options.namespace] : await listNamespaces(repoRoot, actor));
  const targetNamespaces = namespaces.length > 0 ? namespaces : [DEFAULT_NAMESPACE];
  const records = (
    await Promise.all(
      targetNamespaces.map(async (namespace) => {
        const loaded = await readNamespaceRecords(repoRoot, actor, namespace, {
          includeExpired: options.includeExpired,
          maxEntries: options.maxEntries,
          now: options.now
        });
        return loaded.records;
      })
    )
  ).flat();

  const filtered = sortRecords(records).filter((record) => (options.runId ? record.runId === options.runId : true));
  return typeof options.last === "number" ? filtered.slice(-Math.max(0, options.last)) : filtered;
}

export async function getAgentDailyUsage(repoRoot: string, actor: string, day: string, now?: Date): Promise<AgentDailyUsage> {
  const records = await listAgentMemory(repoRoot, actor, { last: DEFAULT_MAX_ENTRIES, now });
  const daily = records.filter((record) => record.at.startsWith(day));
  return {
    actor,
    day,
    interactions: daily.length,
    tokens: daily.reduce((sum, record) => sum + (record.tokenUsage ?? 0), 0)
  };
}

export async function appendAgentMemory(
  repoRoot: string,
  actor: string,
  record: Omit<AgentMemoryRecord, "at" | "sequence" | "namespace" | "expiresAt">,
  options: AppendAgentMemoryOptions = {}
) {
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? new Date();
  const loaded = await readNamespaceRecords(repoRoot, actor, namespace, {
    maxEntries: options.maxEntries,
    now
  });

  const row: AgentMemoryRecord = {
    ...record,
    namespace,
    sequence: loaded.records.reduce((max, entry) => Math.max(max, entry.sequence), 0) + 1,
    at: now.toISOString(),
    expiresAt: ttlMs > 0 ? new Date(now.getTime() + ttlMs).toISOString() : undefined
  };

  const retained = sortRecords([...loaded.records, row]).slice(-Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES));
  await fs.mkdir(path.dirname(loaded.file), { recursive: true });
  await fs.writeFile(loaded.file, `${retained.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf-8");
  return loaded.file;
}
