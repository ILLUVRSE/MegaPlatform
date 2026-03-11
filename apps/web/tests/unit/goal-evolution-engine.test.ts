import { describe, expect, it } from "vitest";
import { evolveGoals } from "@/lib/goalEvolutionEngine";

describe("goal evolution engine", () => {
  it("revises objective sets with evidence-backed rationale", async () => {
    const result = await evolveGoals({
      objectives: [{ id: "retention", weight: 0.5 }],
      evidence: [{ objectiveId: "retention", signal: 0.7, confidence: 0.8 }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.revisedObjectives[0]?.rationale).toBe("evidence_adjusted");
  });
});
