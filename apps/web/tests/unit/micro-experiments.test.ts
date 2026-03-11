import { describe, expect, it } from "vitest";
import { runMicroExperiment } from "@/lib/microExperiments";

describe("micro experiment runner", () => {
  it("blocks high-risk auto experiments", async () => {
    const result = await runMicroExperiment({
      id: "exp-1",
      objectiveId: "global_reliability",
      risk: "high",
      expectedLift: 0.1
    });
    expect(result.ok).toBe(false);
  });
});
