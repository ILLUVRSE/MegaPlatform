import { describe, expect, it } from "vitest";
import { compileAutonomyPolicies } from "@/lib/autonomyPolicyCompiler";

describe("autonomy policy compiler", () => {
  it("compiles deterministic executable constraints", async () => {
    const result = await compileAutonomyPolicies();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.ruleCount).toBeGreaterThan(0);
    expect(result.artifact.compiledRules[0]?.priority).toBeGreaterThanOrEqual(
      result.artifact.compiledRules[result.artifact.compiledRules.length - 1]?.priority ?? 0
    );
    expect(result.artifact.compiledRules.every((rule) => rule.executableKey.length > 0)).toBe(true);
  });
});
