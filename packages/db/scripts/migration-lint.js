#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "db", "migrations-lint.mjs");

const result = spawnSync(process.execPath, [scriptPath], {
  stdio: "inherit",
  cwd: repoRoot,
  env: process.env
});

process.exit(result.status ?? 1);
