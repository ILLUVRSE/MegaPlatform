#!/usr/bin/env node
import { evaluateSlos, loadObservabilityPayload, loadSloManifest, normalizeSloSummaries } from "./lib/slo-evaluator.mjs";

const root = process.cwd();

function parseArgs(argv) {
  const args = { fixture: null, url: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--fixture") {
      args.fixture = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === "--url") {
      args.url = argv[index + 1] ?? null;
      index += 1;
    }
  }
  return args;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = loadSloManifest(root);
  const payload = await loadObservabilityPayload(root, options);
  const summaries = normalizeSloSummaries(payload);
  const result = evaluateSlos(manifest, summaries);

  for (const entry of result.evaluated) {
    if (entry.status === "pass") {
      process.stdout.write(`[slo] PASS ${entry.id}\n`);
      continue;
    }
    process.stderr.write(
      `[slo] ${entry.status === "missing" ? "FAIL" : "BREACH"} ${entry.id}: ${entry.message ?? `${entry.actual} ${entry.operator} ${entry.target} ${entry.unit}`}\n`
    );
  }

  if (result.blockers.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`[slo] FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
