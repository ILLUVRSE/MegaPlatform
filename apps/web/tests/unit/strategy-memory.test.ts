import { describe, expect, it } from "vitest";
import { appendStrategyMemory, listStrategyMemory } from "@/lib/strategyMemory";

describe("long-horizon strategy memory", () => {
  it("stores and lists strategy memory entries with required evidence", async () => {
    const append = await appendStrategyMemory({
      theme: "quarterly reliability",
      summary: "stabilize watch and party during peak windows",
      evidence: [
        { kind: "metric", ref: "ops/logs/autonomous-loop-runs.json" },
        { kind: "decision", ref: "docs/ops_brain/decision-journal.json" },
        { kind: "experiment", ref: "ops/logs/micro-experiment-outcomes.json" }
      ]
    });

    expect(append.ok).toBe(true);
    const listed = await listStrategyMemory();
    expect(listed.entries.length).toBeGreaterThan(0);
  });
});
