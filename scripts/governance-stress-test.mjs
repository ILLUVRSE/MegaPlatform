#!/usr/bin/env node
import { execSync } from "node:child_process";

execSync("pnpm --filter @illuvrse/web test -- --run tests/unit/governance-stress-tests.test.ts", { stdio: "inherit" });
