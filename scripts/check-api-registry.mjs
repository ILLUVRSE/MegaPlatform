#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const registryPath = path.join(ROOT, "docs", "api-registry.web.json");

function normalizePayload(content) {
  const parsed = JSON.parse(content);
  return {
    scope: parsed.scope,
    routeCount: parsed.routeCount,
    routes: parsed.routes
  };
}

const before = normalizePayload(readFileSync(registryPath, "utf-8"));
const run = spawnSync("node", ["scripts/generate-api-registry.mjs"], {
  cwd: ROOT,
  env: process.env,
  encoding: "utf-8"
});

if (run.status !== 0) {
  process.stderr.write(run.stderr || run.stdout || "[api-registry] generation failed\n");
  process.exit(1);
}

const after = normalizePayload(readFileSync(registryPath, "utf-8"));

if (JSON.stringify(before) !== JSON.stringify(after)) {
  process.stderr.write("[api-registry] FAIL: registry drift detected. Run `pnpm api:registry:generate` and commit updates.\n");
  process.exit(1);
}

process.stdout.write(`[api-registry] PASS: ${after.routeCount} routes in sync\n`);
