#!/usr/bin/env node
import { spawnSync } from "child_process";

const quick = process.argv.includes("--quick");

const checks = [
  { name: "db-safety", cmd: ["pnpm", ["db:safety"]] },
  { name: "governance", cmd: ["pnpm", ["governance:check"]] },
  { name: "config-contract", cmd: ["pnpm", ["config:contract:check"]] },
  { name: "api-registry", cmd: ["pnpm", ["api:registry:check"]] },
  { name: "platform-runtime", cmd: ["pnpm", ["platform:runtime:check"]] },
  { name: "boundaries", cmd: ["pnpm", ["boundaries:check"]] },
  { name: "key-rotation", cmd: ["pnpm", ["security:key-rotation:check"]] },
  { name: "supply-chain", cmd: ["pnpm", ["security:supply-chain:check"]] },
  { name: "lint", cmd: ["pnpm", ["lint"]] },
  { name: "typecheck", cmd: ["pnpm", ["typecheck"]] },
  {
    name: "party-slo",
    cmd: ["pnpm", ["--filter", "@illuvrse/web", "test", "--", "--run", "party-slo.test.ts"]]
  },
  {
    name: "studio-worker-retry",
    cmd: ["pnpm", ["--filter", "@illuvrse/web", "test", "--", "--run", "studio-worker-retry.test.ts"]]
  },
  { name: "unit", cmd: ["pnpm", ["test"]] },
  ...(quick ? [] : [{ name: "e2e-smoke", cmd: ["pnpm", ["test:e2e:smoke"]] }])
];

const run = (name, command, args) => {
  process.stdout.write(`\n[shipcheck] ${name}\n`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env
  });
  return result.status === 0;
};

const checkPrSize = () => {
  const result = spawnSync("git", ["diff", "--shortstat"], { encoding: "utf-8" });
  if (result.status !== 0) return;
  const text = (result.stdout || "").trim();
  if (!text) return;

  const files = Number((text.match(/(\d+) files? changed/) || [])[1] || 0);
  const insertions = Number((text.match(/(\d+) insertions?/) || [])[1] || 0);
  const deletions = Number((text.match(/(\d+) deletions?/) || [])[1] || 0);
  const totalLines = insertions + deletions;

  if (files > 30 || totalLines > 800) {
    process.stdout.write(
      `\n[shipcheck][warn] Large PR footprint detected (${files} files, ${totalLines} lines). Guideline: keep under 30 files and 800 lines when practical.\n`
    );
  }
};

const results = checks.map(({ name, cmd }) => ({
  name,
  ok: run(name, cmd[0], cmd[1])
}));

const failed = results.filter((entry) => !entry.ok);
checkPrSize();

process.stdout.write("\n[shipcheck] Summary\n");
for (const result of results) {
  process.stdout.write(`- ${result.ok ? "PASS" : "FAIL"} ${result.name}\n`);
}

if (failed.length > 0) {
  process.exit(1);
}
