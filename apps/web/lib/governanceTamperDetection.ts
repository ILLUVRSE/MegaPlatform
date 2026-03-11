import path from "path";
import { promises as fs } from "fs";
import { createHash } from "crypto";
import { z } from "zod";

const policySchema = z.object({
  monitoredPaths: z.array(z.string().min(1)).min(1),
  snapshotPath: z.string().min(1),
  hashAlgorithm: z.literal("sha256"),
  failOnMissing: z.boolean()
});

const defaultPolicy = {
  monitoredPaths: ["ops/governance"],
  snapshotPath: "ops/logs/governance-integrity-snapshot.json",
  hashAlgorithm: "sha256" as const,
  failOnMissing: true
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "governance-tamper-detection.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function collectFiles(root: string, relativePath: string, acc: string[]) {
  const absolute = path.join(root, relativePath);
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    const childRelative = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, childRelative, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      acc.push(childRelative);
    }
  }
}

async function fileHash(absolutePath: string) {
  const data = await fs.readFile(absolutePath);
  return createHash("sha256").update(data).digest("hex");
}

export async function runGovernanceTamperScan() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const files: string[] = [];
  for (const monitoredPath of policy.monitoredPaths) {
    if (!(await exists(path.join(root, monitoredPath)))) {
      if (policy.failOnMissing) {
        return { ok: false as const, reason: `missing_monitored_path:${monitoredPath}` };
      }
      continue;
    }
    await collectFiles(root, monitoredPath, files);
  }

  files.sort();

  const currentHashes: Record<string, string> = {};
  for (const file of files) {
    currentHashes[file] = await fileHash(path.join(root, file));
  }

  let previous: { algorithm: string; files: Record<string, string> } = { algorithm: "sha256", files: {} };
  try {
    const raw = await fs.readFile(path.join(root, policy.snapshotPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.algorithm === "sha256" && parsed.files) {
      previous = parsed;
    }
  } catch {
    previous = { algorithm: "sha256", files: {} };
  }

  const tampered = Object.entries(currentHashes)
    .filter(([file, hash]) => previous.files[file] && previous.files[file] !== hash)
    .map(([file, hash]) => ({ file, previousHash: previous.files[file], currentHash: hash }));

  const removed = Object.keys(previous.files)
    .filter((file) => !(file in currentHashes))
    .map((file) => ({ file, previousHash: previous.files[file] }));

  const snapshot = {
    algorithm: "sha256",
    files: currentHashes
  };
  await fs.writeFile(path.join(root, policy.snapshotPath), `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    tamperDetected: tampered.length > 0 || removed.length > 0,
    tampered,
    removed,
    monitoredFileCount: files.length
  };
}
