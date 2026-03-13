import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(testDir, "..");

test("prisma schema exposes show project collaborators", async () => {
  const schema = await readFile(path.join(packageDir, "schema.prisma"), "utf8");

  assert.match(schema, /enum ShowProjectCollaboratorRole \{/);
  assert.match(schema, /model ShowProjectCollaborator \{/);

  for (const role of ["OWNER", "EDITOR", "WRITER", "PRODUCER", "VIEWER"]) {
    assert.match(schema, new RegExp(`\\b${role}\\b`), `ShowProjectCollaboratorRole should include ${role}`);
  }

  for (const fieldName of ["showProjectId", "userId", "role", "createdAt", "updatedAt"]) {
    assert.match(schema, new RegExp(`\\b${fieldName}\\b`), `ShowProjectCollaborator.${fieldName} should exist`);
  }
});
