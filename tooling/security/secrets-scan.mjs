#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PLACEHOLDER_PATTERN =
  /(example|replace|changeme|change-me|dummy|sample|placeholder|fake|test|localhost|invalid|redacted)/i;
const ALLOW_MARKER = "secret-scan: allow";
const DEFAULT_MAX_FILE_SIZE_BYTES = 512 * 1024;

export const SECRET_PATTERNS = [
  {
    id: "aws-access-key",
    description: "AWS access key id",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    gitPickaxe: "AKIA[0-9A-Z]{16}"
  },
  {
    id: "github-token",
    description: "GitHub personal access token",
    regex: /\bgh[pousr]_[A-Za-z0-9]{30,255}\b/g,
    gitPickaxe: "gh[pousr]_[A-Za-z0-9]{30,255}"
  },
  {
    id: "openai-key",
    description: "OpenAI API key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
    gitPickaxe: "sk-[A-Za-z0-9]{20,}"
  },
  {
    id: "slack-token",
    description: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,80}\b/g,
    gitPickaxe: "xox[baprs]-[A-Za-z0-9-]{10,80}"
  },
  {
    id: "generic-secret-assignment",
    description: "High-entropy secret assignment",
    regex:
      /\b[A-Za-z0-9_-]*(?:secret|token|api(?:_|-)?key|password|private(?:_|-)?key)\b[ \t]*[:=][ \t]*["'][A-Za-z0-9/+_.=-]{24,}["']/gi,
    gitPickaxe:
      "[A-Za-z0-9_-]*(secret|token|api[_-]?key|password|private[_-]?key)[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9/+_.=-]{24,}[\"']"
  }
];

function runGit(cwd, args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (allowFailure) return "";
    const stderr = error.stderr?.toString?.() ?? error.message;
    throw new Error(stderr.trim() || `git ${args.join(" ")} failed`);
  }
}

function resolveRepoRoot(startDir) {
  return runGit(startDir, ["rev-parse", "--show-toplevel"]).trim();
}

function isBinaryText(content) {
  return content.includes("\u0000");
}

function shouldIgnoreLine(line) {
  return line.includes(ALLOW_MARKER) || PLACEHOLDER_PATTERN.test(line);
}

function shouldIgnorePath(filePath) {
  return (
    filePath.startsWith(".git/") ||
    filePath.startsWith("analysis/") ||
    filePath.includes("/node_modules/") ||
    filePath.includes("/dist/") ||
    filePath.includes("/coverage/") ||
    filePath.endsWith(".png") ||
    filePath.endsWith(".jpg") ||
    filePath.endsWith(".jpeg") ||
    filePath.endsWith(".gif") ||
    filePath.endsWith(".webp") ||
    filePath.endsWith(".ico") ||
    filePath.endsWith(".pdf") ||
    filePath.endsWith(".zip") ||
    filePath.endsWith(".gz") ||
    filePath.endsWith(".lock")
  );
}

function normalizeLine(rawLine) {
  return rawLine.startsWith("+") ? rawLine.slice(1) : rawLine;
}

export function scanText(text, source, { history = false } = {}) {
  if (!text || isBinaryText(text)) return [];

  const findings = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = normalizeLine(rawLine);
    if (!line || shouldIgnoreLine(line)) return;

    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      const match = regex.exec(line);
      if (!match) continue;

      findings.push({
        source,
        line: index + 1,
        type: pattern.id,
        description: pattern.description,
        snippet: match[0].slice(0, 120),
        history
      });
    }
  });

  return findings;
}

function listTrackedFiles(repoRoot) {
  return runGit(repoRoot, ["ls-files", "-z"])
    .split("\u0000")
    .filter(Boolean)
    .filter((file) => !shouldIgnorePath(file));
}

function listStagedFiles(repoRoot) {
  return runGit(repoRoot, ["diff", "--cached", "--name-only", "-z"])
    .split("\u0000")
    .filter(Boolean)
    .filter((file) => !shouldIgnorePath(file));
}

function readTrackedFile(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = readFileSync(absolutePath);
  if (stat.length > DEFAULT_MAX_FILE_SIZE_BYTES) return "";
  return stat.toString("utf8");
}

function readStagedFile(repoRoot, relativePath) {
  const content = runGit(repoRoot, ["show", `:${relativePath}`], true);
  if (Buffer.byteLength(content, "utf8") > DEFAULT_MAX_FILE_SIZE_BYTES) return "";
  return content;
}

export function scanWorkingTree(repoRoot) {
  const findings = [];
  for (const relativePath of listTrackedFiles(repoRoot)) {
    const content = readTrackedFile(repoRoot, relativePath);
    findings.push(...scanText(content, relativePath));
  }
  return dedupeFindings(findings);
}

export function scanStagedFiles(repoRoot) {
  const findings = [];
  for (const relativePath of listStagedFiles(repoRoot)) {
    const content = readStagedFile(repoRoot, relativePath);
    findings.push(...scanText(content, relativePath));
  }
  return dedupeFindings(findings);
}

export function scanGitHistory(repoRoot) {
  const findings = [];
  const commits = runGit(repoRoot, ["rev-list", "--all"], true)
    .split(/\r?\n/)
    .filter(Boolean);

  for (const commit of commits) {
    const diff = runGit(repoRoot, ["show", "--format=", "--unified=0", "--text", commit, "--", "."], true);
    const commitFindings = scanText(diff, commit, { history: true }).map((entry) => ({
      ...entry,
      source: `${entry.source}:${entry.line}`
    }));
    findings.push(...commitFindings);
  }

  return dedupeFindings(findings);
}

function dedupeFindings(findings) {
  const unique = new Map();
  for (const finding of findings) {
    const key = `${finding.history ? "history" : "tree"}:${finding.source}:${finding.line}:${finding.type}:${finding.snippet}`;
    if (!unique.has(key)) unique.set(key, finding);
  }
  return [...unique.values()];
}

export function scanRepository(startDir, options = {}) {
  const repoRoot = resolveRepoRoot(startDir);
  const stagedOnly = options.stagedOnly === true;
  const includeHistory = options.includeHistory !== false && !stagedOnly;
  const includeWorkingTree = options.includeWorkingTree !== false && !stagedOnly;

  return {
    repoRoot,
    findings: dedupeFindings([
      ...(stagedOnly ? scanStagedFiles(repoRoot) : []),
      ...(includeWorkingTree ? scanWorkingTree(repoRoot) : []),
      ...(includeHistory ? scanGitHistory(repoRoot) : [])
    ])
  };
}

function formatFinding(finding) {
  const scope = finding.history ? "history" : "tree";
  return `[${scope}] ${finding.source}:${finding.line} ${finding.type} -> ${finding.snippet}`;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const cwd = process.cwd();
  const stagedOnly = args.has("--staged");
  const explicitScan = args.has("--scan");

  const { findings } = scanRepository(cwd, {
    stagedOnly,
    includeWorkingTree: stagedOnly ? false : true,
    includeHistory: stagedOnly ? false : explicitScan || true
  });

  if (findings.length === 0) {
    process.stdout.write(
      `[secrets-scan] PASS: no candidate secrets found (${stagedOnly ? "staged" : explicitScan ? "repo+history" : "repo+history"})\n`
    );
    return;
  }

  process.stderr.write("[secrets-scan] FAIL: possible secrets detected\n");
  for (const finding of findings) {
    process.stderr.write(`${formatFinding(finding)}\n`);
  }
  process.stderr.write(`Allow known test fixtures with '${ALLOW_MARKER}' on the same line.\n`);
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main();
}
