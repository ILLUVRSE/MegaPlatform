import { describe, expect, it } from "vitest";
import { detectDeceptionManipulation } from "@/lib/deceptionDetection";

describe("deception manipulation detection", () => {
  it("flags high-risk deceptive signal bundles", async () => {
    const result = await detectDeceptionManipulation({
      signals: {
        instruction_override: 0.9,
        identity_spoofing: 0.8,
        tool_chain_diversion: 0.6,
        coercive_language: 0.5
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.topSignals.length).toBeGreaterThan(0);
  });
});
