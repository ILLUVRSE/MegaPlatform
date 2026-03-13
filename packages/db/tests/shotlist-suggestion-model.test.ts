import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(testDir, "..");

test("prisma schema exposes shotlist suggestions", async () => {
  const schema = await readFile(path.join(packageDir, "schema.prisma"), "utf8");

  assert.match(schema, /model ShotlistSuggestion \{/);

  for (const fieldName of [
    "showEpisodeId",
    "showSceneId",
    "shotNumber",
    "title",
    "framing",
    "cameraMotion",
    "lens",
    "durationSeconds",
    "rationale",
    "isDraft"
  ]) {
    assert.match(schema, new RegExp(`\\b${fieldName}\\b`), `ShotlistSuggestion.${fieldName} should exist`);
  }
});
