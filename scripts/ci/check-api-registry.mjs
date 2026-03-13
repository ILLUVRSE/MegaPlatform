#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const registryPath = path.join(ROOT, "docs", "api-registry.web.json");
const generateCommand = ["api:registry:generate"];
const originalRegistry = readFileSync(registryPath, "utf-8");

function runGenerator() {
  return spawnSync("pnpm", generateCommand, {
    cwd: ROOT,
    env: process.env,
    encoding: "utf-8",
    shell: process.platform === "win32"
  });
}

const generation = runGenerator();

if (generation.status !== 0) {
  process.stderr.write(generation.stderr || generation.stdout || "[api-registry] generation failed\n");
  process.exit(generation.status ?? 1);
}

const generatedRegistry = readFileSync(registryPath, "utf-8");
const driftDetected = originalRegistry !== generatedRegistry;

if (driftDetected) {
  writeFileSync(registryPath, originalRegistry);
  process.stderr.write(
    "[api-registry] FAIL: docs/api-registry.web.json is out of date. Run `pnpm api:registry:generate` and commit the updated registry.\n"
  );
  process.exit(1);
}

process.stdout.write("[api-registry] PASS: docs/api-registry.web.json matches generated output\n");
