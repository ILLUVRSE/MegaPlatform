import { describe, expect, it } from "vitest";
import { runAutonomousConstitutionalTests } from "@/lib/autonomousConstitutionalTests";

describe("autonomous constitutional tests", () => {
  it("runs invariants and gates unsafe actions", async () => {
    const result = await runAutonomousConstitutionalTests({ decisionId: "d1", satisfiedInvariants: ["human_oversight"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pass).toBe(false);
    expect(result.executionGate).toBe("block");
  });
});
