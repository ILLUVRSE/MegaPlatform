import { readFileSync } from "node:fs";
import path from "node:path";

export function loadSloManifest(root) {
  const manifestPath = path.join(root, "ops", "governance", "slos.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(parsed)) {
    throw new Error("ops/governance/slos.json must be an array");
  }
  return parsed;
}

export async function loadObservabilityPayload(root, options) {
  if (options.fixture) {
    const fixturePath = path.join(root, options.fixture);
    return JSON.parse(readFileSync(fixturePath, "utf-8"));
  }

  const url = options.url ?? process.env.OBSERVABILITY_SUMMARY_URL;
  if (!url) {
    throw new Error("provide --fixture or --url (or OBSERVABILITY_SUMMARY_URL)");
  }

  const response = await fetch(url, {
    headers: process.env.OBSERVABILITY_BEARER_TOKEN
      ? { Authorization: `Bearer ${process.env.OBSERVABILITY_BEARER_TOKEN}` }
      : undefined
  });

  if (!response.ok) {
    throw new Error(`observability fetch failed (${response.status})`);
  }

  return response.json();
}

export function normalizeSloSummaries(payload) {
  if (Array.isArray(payload?.sloSummaries)) {
    return payload.sloSummaries;
  }
  if (Array.isArray(payload?.slos)) {
    return payload.slos.map((row) => ({
      id: row.id,
      name: row.name,
      actual: row.actual,
      target: row.target,
      operator: row.operator,
      unit: row.unit,
      severity: row.severity,
      pass: row.pass
    }));
  }
  throw new Error("observability payload missing sloSummaries/slos");
}

function compare(actual, operator, target) {
  if (operator === ">=") return actual >= target;
  if (operator === "<=") return actual <= target;
  throw new Error(`unsupported operator ${String(operator)}`);
}

export function evaluateSlos(manifest, summaries) {
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));
  const evaluated = manifest.map((slo) => {
    const summary = summaryById.get(slo.id);
    if (!summary) {
      return {
        id: slo.id,
        name: slo.name,
        status: "missing",
        severity: slo.severity,
        message: "missing observability summary"
      };
    }

    const actual = Number(summary.actual);
    const pass = Number.isFinite(actual) && compare(actual, slo.operator, slo.target);
    return {
      id: slo.id,
      name: slo.name,
      status: pass ? "pass" : "breach",
      severity: slo.severity,
      actual,
      target: slo.target,
      operator: slo.operator,
      unit: slo.unit
    };
  });

  const blockers = evaluated.filter((entry) => entry.status !== "pass" && entry.severity !== "warning");
  const warnings = evaluated.filter((entry) => entry.status !== "pass" && entry.severity === "warning");
  return { evaluated, blockers, warnings };
}
