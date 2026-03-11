import { describe, expect, it } from "vitest";
import { runContinuousRedTeamSimulation } from "@/lib/continuousRedTeamSimulator";

describe("continuous red-team simulator", () => {
  it("surfaces high-severity adversarial findings", async () => {
    const result = await runContinuousRedTeamSimulation({
      scenarios: [
        { id: "rt1", category: "prompt_injection", score: 0.81 },
        { id: "rt2", category: "tool_misuse", score: 0.52 }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.surfacedCount).toBeGreaterThan(0);
  });
});
