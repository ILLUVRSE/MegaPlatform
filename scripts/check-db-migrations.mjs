#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(REPO_ROOT, "packages", "db", "migrations");
const LOCK_FILE = path.join(MIGRATIONS_DIR, "migration_lock.toml");
const NAME_PATTERN = /^\d{14}_[a-z0-9_]+$/;
const ALLOW_DESTRUCTIVE_MARKER = "MIGRATION_ALLOW_DESTRUCTIVE:";

const DESTRUCTIVE_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+SCHEMA\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\s+TABLE\b[\s\S]{0,200}\bDROP\s+CONSTRAINT\b/i
];

function fail(message) {
  console.error(`[db:migrations:lint] FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[db:migrations:lint] ${message}`);
}

function listMigrationDirs() {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function main() {
  let hasFailures = false;

  try {
    const lockStat = statSync(LOCK_FILE);
    if (!lockStat.isFile()) {
      fail("`packages/db/migrations/migration_lock.toml` must be a file.");
      hasFailures = true;
    }
  } catch {
    fail("Missing `packages/db/migrations/migration_lock.toml`.");
    hasFailures = true;
  }

  const migrationDirs = listMigrationDirs();
  if (migrationDirs.length === 0) {
    fail("No migration directories found.");
    hasFailures = true;
  }

  let previousTimestamp = null;
  const seenTimestamps = new Set();
  const allowDestructiveGlobal = process.env.MIGRATION_LINT_ALLOW_DESTRUCTIVE === "true";

  for (const dir of migrationDirs) {
    if (!NAME_PATTERN.test(dir)) {
      fail(`Invalid migration directory name: ${dir} (expected YYYYMMDDHHMMSS_description).`);
      hasFailures = true;
      continue;
    }

    const [timestamp] = dir.split("_");
    if (seenTimestamps.has(timestamp)) {
      fail(`Duplicate migration timestamp detected: ${timestamp}`);
      hasFailures = true;
    }
    seenTimestamps.add(timestamp);

    if (previousTimestamp && timestamp < previousTimestamp) {
      fail(`Migration timestamps are not monotonic: ${previousTimestamp} then ${timestamp}.`);
      hasFailures = true;
    }
    previousTimestamp = timestamp;

    const migrationSqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    let sql = "";
    try {
      sql = readFileSync(migrationSqlPath, "utf-8");
    } catch {
      fail(`Missing migration.sql in ${dir}`);
      hasFailures = true;
      continue;
    }

    if (!sql.trim()) {
      fail(`Empty migration.sql in ${dir}`);
      hasFailures = true;
      continue;
    }

    const allowDestructiveInFile = sql.includes(ALLOW_DESTRUCTIVE_MARKER);
    if (!allowDestructiveGlobal && !allowDestructiveInFile) {
      for (const pattern of DESTRUCTIVE_PATTERNS) {
        if (pattern.test(sql)) {
          fail(
            `${dir} includes potentially destructive SQL (${pattern}) without '${ALLOW_DESTRUCTIVE_MARKER} <reason>' marker.`
          );
          hasFailures = true;
          break;
        }
      }
    }
  }

  if (hasFailures) {
    console.error("[db:migrations:lint] See MIGRATIONS.md for policy and override instructions.");
    process.exit(1);
  }

  ok(`Checked ${migrationDirs.length} migration directories.`);
}

main();
