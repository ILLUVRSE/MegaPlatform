#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const NAME_PATTERN = /^\d{14}_[a-z0-9_]+$/;
const ALLOW_DESTRUCTIVE_MARKER = "MIGRATION_ALLOW_DESTRUCTIVE:";
const DEFAULT_RECENT_MIGRATIONS = 10;

const GLOBAL_DESTRUCTIVE_PATTERNS = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
  { label: "DROP SCHEMA", pattern: /\bDROP\s+SCHEMA\b/i },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\b/i },
  { label: "ALTER TABLE ... DROP CONSTRAINT", pattern: /\bALTER\s+TABLE\b[\s\S]{0,200}\bDROP\s+CONSTRAINT\b/i }
];

const RECENT_DESTRUCTIVE_PATTERNS = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
  {
    label: "ALTER ... DROP",
    pattern: /\bALTER\b[\s\S]{0,200}\bDROP\b(?!\s+(?:DEFAULT|NOT\s+NULL)\b)/i
  }
];

function buildPaths(repoRoot) {
  const migrationsDir = path.join(repoRoot, "packages", "db", "migrations");
  return {
    migrationsDir,
    lockFile: path.join(migrationsDir, "migration_lock.toml")
  };
}

function listMigrationDirs(migrationsDir) {
  const entries = readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function parseRecentCount(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RECENT_MIGRATIONS;
}

function hasDestructiveJustification(sql) {
  return new RegExp(`${ALLOW_DESTRUCTIVE_MARKER}\\s*\\S+`).test(sql);
}

function findMatchingRule(sql, rules) {
  return rules.find(({ pattern }) => pattern.test(sql)) ?? null;
}

export function lintMigrations({
  repoRoot = process.cwd(),
  env = process.env
} = {}) {
  const errors = [];
  const { migrationsDir, lockFile } = buildPaths(repoRoot);

  try {
    const lockStat = statSync(lockFile);
    if (!lockStat.isFile()) {
      errors.push("`packages/db/migrations/migration_lock.toml` must be a file.");
    }
  } catch {
    errors.push("Missing `packages/db/migrations/migration_lock.toml`.");
  }

  let migrationDirs = [];
  try {
    migrationDirs = listMigrationDirs(migrationsDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Unable to read migrations directory: ${message}`);
    return { errors, migrationDirs, recentMigrationDirs: [] };
  }

  if (migrationDirs.length === 0) {
    errors.push("No migration directories found.");
  }

  const recentCount = parseRecentCount(env.MIGRATION_LINT_RECENT_COUNT);
  const recentMigrationDirs = migrationDirs.slice(-recentCount);
  const recentMigrationSet = new Set(recentMigrationDirs);
  const allowDestructiveInCi =
    env.ALLOW_DESTRUCTIVE === "true" || env.MIGRATION_LINT_ALLOW_DESTRUCTIVE === "true";
  const runningInCi = env.CI === "true";

  let previousTimestamp = null;
  const seenTimestamps = new Set();

  for (const dir of migrationDirs) {
    if (!NAME_PATTERN.test(dir)) {
      errors.push(`Invalid migration directory name: ${dir} (expected YYYYMMDDHHMMSS_description).`);
      continue;
    }

    const [timestamp] = dir.split("_");
    if (seenTimestamps.has(timestamp)) {
      errors.push(`Duplicate migration timestamp detected: ${timestamp}`);
    }
    seenTimestamps.add(timestamp);

    if (previousTimestamp && timestamp < previousTimestamp) {
      errors.push(`Migration timestamps are not monotonic: ${previousTimestamp} then ${timestamp}.`);
    }
    previousTimestamp = timestamp;

    const migrationSqlPath = path.join(migrationsDir, dir, "migration.sql");
    let sql = "";
    try {
      sql = readFileSync(migrationSqlPath, "utf-8");
    } catch {
      errors.push(`Missing migration.sql in ${dir}`);
      continue;
    }

    if (!sql.trim()) {
      errors.push(`Empty migration.sql in ${dir}`);
      continue;
    }

    const globalMatch = findMatchingRule(sql, GLOBAL_DESTRUCTIVE_PATTERNS);
    const recentMatch = recentMigrationSet.has(dir) ? findMatchingRule(sql, RECENT_DESTRUCTIVE_PATTERNS) : null;
    const hasJustification = hasDestructiveJustification(sql);

    if ((globalMatch || recentMatch) && !hasJustification) {
      const matchLabel = recentMatch?.label ?? globalMatch?.label ?? "destructive SQL";
      errors.push(
        `${dir} includes potentially destructive SQL (${matchLabel}) without '-- ${ALLOW_DESTRUCTIVE_MARKER} <reason>'.`
      );
      continue;
    }

    if (recentMatch && runningInCi && !allowDestructiveInCi) {
      errors.push(
        `${dir} includes recent destructive SQL (${recentMatch.label}). CI requires ALLOW_DESTRUCTIVE=true in addition to '-- ${ALLOW_DESTRUCTIVE_MARKER} <reason>'.`
      );
    }
  }

  return { errors, migrationDirs, recentMigrationDirs };
}

export function main() {
  const { errors, migrationDirs, recentMigrationDirs } = lintMigrations();

  if (errors.length > 0) {
    for (const message of errors) {
      console.error(`[db:migrations:lint] FAIL: ${message}`);
    }
    console.error("[db:migrations:lint] See packages/db/MIGRATIONS.md for policy and override instructions.");
    process.exit(1);
  }

  console.log(
    `[db:migrations:lint] Checked ${migrationDirs.length} migration directories (${recentMigrationDirs.length} recent).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
