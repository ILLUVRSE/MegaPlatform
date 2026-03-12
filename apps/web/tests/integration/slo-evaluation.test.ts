import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  evaluateSlos,
  loadSloManifest,
  normalizeSloSummaries
} from "../../../../scripts/lib/slo-evaluator.mjs";

const root = path.resolve(__dirname, "../../../..");

describe("slo evaluation script", () => {
  it("passes against the CI observability fixture", () => {
    const manifest = loadSloManifest(root);
    const fixture = JSON.parse(readFileSync(path.join(root, "ops/fixtures/observability-summary.ci.json"), "utf-8"));
    const result = evaluateSlos(manifest, normalizeSloSummaries(fixture));

    expect(result.blockers).toEqual([]);
    expect(result.evaluated.every((entry) => entry.status === "pass")).toBe(true);
  });

  it("fails when a critical SLO is breached", () => {
    const manifest = loadSloManifest(root);
    const fixture = JSON.parse(
      readFileSync(path.join(root, "apps/web/tests/fixtures/observability-summary.breach.json"), "utf-8")
    );
    const result = evaluateSlos(manifest, normalizeSloSummaries(fixture));

    expect(result.blockers.map((entry) => entry.id)).toContain("studio-failure-rate-24h");
  });
});
