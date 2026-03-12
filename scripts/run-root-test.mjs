#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2).flatMap((arg) => {
  if (arg === "--reporter=spec") return ["--reporter=verbose"];
  return [arg];
});

const result = spawnSync(
  "pnpm",
  ["--filter", "@illuvrse/web", "exec", "vitest", "run", "--config", "tests/vitest.config.ts", ...forwardedArgs],
  {
    stdio: "inherit",
    env: process.env
  }
);

process.exit(result.status ?? 1);
