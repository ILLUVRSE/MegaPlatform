import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(testDir, "..");

test("prisma schema exposes interactive extras scaffold", async () => {
  const schema = await readFile(path.join(packageDir, "schema.prisma"), "utf8");

  assert.match(schema, /enum InteractiveExtraType \{/);
  assert.match(schema, /enum InteractiveExtraPublishStatus \{/);
  assert.match(schema, /model InteractiveExtra \{/);

  for (const type of ["POLL", "CALLOUT"]) {
    assert.match(schema, new RegExp(`\\b${type}\\b`), `InteractiveExtraType should include ${type}`);
  }

  for (const fieldName of ["showId", "episodeId", "type", "title", "payload", "publishStatus"]) {
    assert.match(schema, new RegExp(`\\b${fieldName}\\b`), `InteractiveExtra.${fieldName} should exist`);
  }
});
