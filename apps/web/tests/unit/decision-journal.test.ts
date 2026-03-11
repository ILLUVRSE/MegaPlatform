import path from "path";
import { promises as fs } from "fs";
import { describe, expect, it } from "vitest";
import { appendDecisionJournalEntry, queryDecisionJournal } from "@/lib/decisionJournal";

async function setupTempRepoRoot(name: string) {
  const root = path.join(process.cwd(), "tests", "tmp", name);
  await fs.mkdir(path.join(root, "ops", "governance"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "ops_brain"), { recursive: true });

  await fs.writeFile(
    path.join(root, "ops", "governance", "decision-journal.json"),
    JSON.stringify(
      {
        requiredEvidenceKinds: ["metric"],
        requiredFields: ["agentRole", "decisionType", "rationale", "evidence", "confidence", "riskLevel"],
        minConfidence: 0.5,
        maxEntryAgeDays: 90
      },
      null,
      2
    )
  );

  await fs.writeFile(path.join(root, "docs", "ops_brain", "decision-journal.json"), "[]\n");
  return root;
}

describe("decision journal automation", () => {
  it("records valid decision entries", async () => {
    const root = await setupTempRepoRoot("decision-journal-valid");
    const result = await appendDecisionJournalEntry(
      {
        agentRole: "director",
        decisionType: "roadmap_reprioritization",
        rationale: "SLO breach trend requires queue hardening first",
        evidence: [{ kind: "metric", ref: "ops/logs/autonomous-loop-runs.json" }],
        confidence: 0.76,
        riskLevel: "medium",
        outcomes: ["phase-107 deprioritized"]
      },
      { rootOverride: root }
    );

    expect(result.ok).toBe(true);

    const queried = await queryDecisionJournal({ agentRole: "director" }, { rootOverride: root });
    expect(queried.ok).toBe(true);
    if (!queried.ok) return;
    expect(queried.entries.length).toBe(1);
    expect(queried.entries[0].decisionType).toBe("roadmap_reprioritization");
  });

  it("blocks entries under minimum confidence", async () => {
    const root = await setupTempRepoRoot("decision-journal-low-confidence");
    const result = await appendDecisionJournalEntry(
      {
        agentRole: "ops",
        decisionType: "incident_action",
        rationale: "Attempt immediate failover",
        evidence: [{ kind: "metric", ref: "ops/logs/incident.json" }],
        confidence: 0.2,
        riskLevel: "high"
      },
      { rootOverride: root }
    );

    expect(result.ok).toBe(false);
  });
});
