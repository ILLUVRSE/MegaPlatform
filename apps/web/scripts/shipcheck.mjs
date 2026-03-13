#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const quick = process.argv.includes("--quick");

const checks = [
  {
    name: "key-rotation",
    command: "node",
    args: [path.join(repoRoot, "scripts", "security", "key-rotation-check.mjs"), "--dry-run"]
  },
  {
    name: "platform-shipcheck",
    command: "pnpm",
    args: ["-C", repoRoot, ...(quick ? ["shipcheck:quick"] : ["shipcheck"])],
    env: { SKIP_KEY_ROTATION_CHECK: "1" }
  }
];

for (const check of checks) {
  process.stdout.write(`\n[web-shipcheck] ${check.name}\n`);
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...(check.env ?? {}) }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

