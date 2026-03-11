#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const root = process.cwd();
const policyPath = path.join(root, "ops", "governance", "safety-regression-gate.json");
const metricsPath = path.join(root, "ops", "logs", "safety-metrics.json");

const policy = JSON.parse(readFileSync(policyPath, "utf-8"));
const metrics = JSON.parse(readFileSync(metricsPath, "utf-8"));

const failedMetrics = [];
for (const [metric, maxAllowed] of Object.entries(policy.thresholds)) {
  const value = metrics[metric];
  if (typeof value !== "number") {
    if (policy.blockOnMissingMetrics) {
      failedMetrics.push({ metric, value: null, maxAllowed, reason: "missing_metric" });
    }
    continue;
  }
  if (value > maxAllowed) {
    failedMetrics.push({ metric, value, maxAllowed, reason: "threshold_exceeded" });
  }
}

const report = {
  ok: failedMetrics.length === 0,
  failedMetrics
};
writeFileSync(path.join(root, policy.reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf-8");

if (!report.ok) {
  process.stderr.write(`[safety-regression] FAIL ${report.failedMetrics.length} metric(s) exceeded\n`);
  process.exit(1);
}
process.stdout.write("[safety-regression] PASS no regressions detected\n");
