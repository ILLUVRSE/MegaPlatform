import { describe, expect, it } from "vitest";
import { scorePrivacyRiskRuntime } from "@/lib/privacyRiskRuntimeScoring";

describe("privacy risk runtime scoring", () => {
  it("blocks high-risk actions", async () => {
    const result = await scorePrivacyRiskRuntime({ actionId: "a-175", dataSensitivity: 1, scope: 0.9, transferRisk: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toBe("block");
  });
});
