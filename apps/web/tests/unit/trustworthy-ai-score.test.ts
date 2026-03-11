import { describe, expect, it } from "vitest";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";

describe("trustworthy ai operations score", () => {
  it("computes bounded score with action limit output", async () => {
    const result = await buildTrustworthyAiOperationsScore();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(["normal", "restricted", "halted"]).toContain(result.actionLimit);
  });
});
