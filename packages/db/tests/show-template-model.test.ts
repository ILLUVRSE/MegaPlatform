import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(testDir, "..");

test("prisma schema exposes show templates", async () => {
  const schema = await readFile(path.join(packageDir, "schema.prisma"), "utf8");

  assert.match(schema, /model ShowTemplate \{/);

  for (const fieldName of [
    "id",
    "title",
    "description",
    "templateType",
    "createdById",
    "visibility",
    "serializedDefaults",
    "sourceShowProjectId",
    "createdAt",
    "updatedAt"
  ]) {
    assert.match(schema, new RegExp(`\\b${fieldName}\\b`), `ShowTemplate.${fieldName} should exist`);
  }
});
