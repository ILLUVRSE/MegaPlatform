import { describe, expect, it } from "vitest";
import { evaluateTemporalPolicyWindow } from "@/lib/temporalPolicyWindows";

describe("temporal policy windows", () => {
  it("applies deterministic time-window decisions", async () => {
    const result = await evaluateTemporalPolicyWindow({
      domain: "ops",
      atIso: "2026-03-04T16:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(["allow", "deny", "require_approval"]).toContain(result.decision);
  });
});
