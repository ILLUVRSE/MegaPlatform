#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "ops", "governance", "supply-chain-policy.json");
const reportPath = path.join(root, "ops", "security", "vulnerability-report.json");

const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };

try {
  const policy = JSON.parse(readFileSync(policyPath, "utf-8"));
  const report = JSON.parse(readFileSync(reportPath, "utf-8"));
  if (!Array.isArray(report)) {
    process.stderr.write("[supply-chain] FAIL: vulnerability-report.json must be an array\n");
    process.exit(1);
  }

  const threshold = severityRank[policy.failOnSeverity] ?? 4;
  const unresolved = report.filter((item) => item && item.fixed === false);
  const blockers = unresolved.filter((item) => {
    const severityBlocked = (severityRank[item.severity] ?? 0) >= threshold;
    const packageBlocked =
      Array.isArray(policy.blockedPackages) &&
      policy.blockedPackages.includes(item.package) &&
      !(Array.isArray(policy.allowlist) && policy.allowlist.includes(item.package));
    return severityBlocked || packageBlocked;
  });

  if (blockers.length > 0) {
    process.stderr.write(
      `[supply-chain] FAIL: ${blockers.length} unresolved blocker vulnerabilities (${blockers
        .map((item) => `${item.package}:${item.severity}`)
        .join(", ")})\n`
    );
    process.exit(1);
  }

  process.stdout.write(`[supply-chain] PASS: ${unresolved.length} unresolved vulnerabilities, 0 blockers\n`);
} catch (error) {
  process.stderr.write(`[supply-chain] FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
