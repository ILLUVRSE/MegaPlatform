import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { lintMigrations } from "../../../scripts/db/migrations-lint.mjs";

async function writeMigrationFixture(migrations: Array<{ dir: string; sql: string }>) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "migration-lint-"));
  const migrationsDir = path.join(fixtureRoot, "packages", "db", "migrations");

  await mkdir(migrationsDir, { recursive: true });
  await writeFile(path.join(migrationsDir, "migration_lock.toml"), "provider = \"postgresql\"\n", "utf8");

  for (const migration of migrations) {
    const migrationDir = path.join(migrationsDir, migration.dir);
    await mkdir(migrationDir, { recursive: true });
    await writeFile(path.join(migrationDir, "migration.sql"), migration.sql, "utf8");
  }

  return fixtureRoot;
}

function runLint(fixtureRoot: string, env: Record<string, string | undefined> = {}) {
  return lintMigrations({
    repoRoot: fixtureRoot,
    env: { ...process.env, ...env }
  });
}

test("fails recent destructive migrations without an in-file justification", async () => {
  const fixtureRoot = await writeMigrationFixture([
    {
      dir: "20260311120000_safe_addition",
      sql: 'CREATE TABLE "SafeTable" ("id" TEXT NOT NULL);\n'
    },
    {
      dir: "20260311143000_drop_table",
      sql: 'DROP TABLE "LegacyTable";\n'
    }
  ]);

  const result = runLint(fixtureRoot, { MIGRATION_LINT_RECENT_COUNT: "2" });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /DROP TABLE/);
  assert.match(result.errors[0], /MIGRATION_ALLOW_DESTRUCTIVE/);
});

test("passes recent destructive migrations locally with an in-file justification", async () => {
  const fixtureRoot = await writeMigrationFixture([
    {
      dir: "20260311143000_drop_column",
      sql: '-- MIGRATION_ALLOW_DESTRUCTIVE: removing retired column after backfill\nALTER TABLE "Users" DROP COLUMN "legacyName";\n'
    }
  ]);

  const result = runLint(fixtureRoot, { MIGRATION_LINT_RECENT_COUNT: "1" });

  assert.deepEqual(result.errors, []);
  assert.equal(result.migrationDirs.length, 1);
});

test("fails recent destructive migrations in CI without ALLOW_DESTRUCTIVE=true", async () => {
  const fixtureRoot = await writeMigrationFixture([
    {
      dir: "20260311143000_drop_column",
      sql: '-- MIGRATION_ALLOW_DESTRUCTIVE: removing retired column after backfill\nALTER TABLE "Users" DROP COLUMN "legacyName";\n'
    }
  ]);

  const result = runLint(fixtureRoot, {
    CI: "true",
    MIGRATION_LINT_RECENT_COUNT: "1"
  });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /ALLOW_DESTRUCTIVE=true/);
});

test("passes recent destructive migrations in CI with ALLOW_DESTRUCTIVE=true", async () => {
  const fixtureRoot = await writeMigrationFixture([
    {
      dir: "20260311143000_drop_constraint",
      sql: '-- MIGRATION_ALLOW_DESTRUCTIVE: swapping to the replacement foreign key\nALTER TABLE "Users" DROP CONSTRAINT "Users_orgId_fkey";\n'
    }
  ]);

  const result = runLint(fixtureRoot, {
    CI: "true",
    ALLOW_DESTRUCTIVE: "true",
    MIGRATION_LINT_RECENT_COUNT: "1"
  });

  assert.deepEqual(result.errors, []);
});

test("ignores non-destructive ALTER ... DROP DEFAULT statements in recent migrations", async () => {
  const fixtureRoot = await writeMigrationFixture([
    {
      dir: "20260311172626_updated_at_cleanup",
      sql: 'ALTER TABLE "Users" ALTER COLUMN "updatedAt" DROP DEFAULT;\n'
    }
  ]);

  const result = runLint(fixtureRoot, {
    CI: "true",
    MIGRATION_LINT_RECENT_COUNT: "1"
  });

  assert.deepEqual(result.errors, []);
});
