import { describe, expect, it } from "vitest";
import { enforceChildSafetyAutonomyConstraints } from "@/lib/childSafetyAutonomyConstraints";

describe("child safety autonomy constraints", () => {
  it("blocks restricted youth-context actions", async () => {
    const result = await enforceChildSafetyAutonomyConstraints({ context: "kids_mode", action: "direct_message", autonomyLevel: "assisted" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
  });
});
