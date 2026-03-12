import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(testDir, "..");

test("prisma migrate status script is configured and invocable", async () => {
  const packageJson = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.["prisma:migrate:status"],
    "prisma migrate status --schema schema.prisma"
  );

  await execFileAsync(
    "pnpm",
    ["exec", "prisma", "migrate", "status", "--schema", "schema.prisma", "--help"],
    {
      cwd: packageDir,
      env: process.env
    }
  );
});

test("prisma schema and client expose the StudioAsset model", async () => {
  const prisma = new PrismaClient();
  const schema = await readFile(path.join(packageDir, "schema.prisma"), "utf8");

  assert.match(schema, /model StudioAsset \{/);
  assert.equal(typeof prisma.studioAsset.findMany, "function");
  for (const fieldName of [
    "id",
    "projectId",
    "uploadId",
    "jobId",
    "s3Key",
    "checksum",
    "size",
    "status",
    "costEstimate",
    "ttlAt",
    "createdAt",
    "finalizedAt"
  ]) {
    assert.match(schema, new RegExp(`\\b${fieldName}\\b`), `StudioAsset.${fieldName} should exist`);
  }

  await prisma.$disconnect();
});
