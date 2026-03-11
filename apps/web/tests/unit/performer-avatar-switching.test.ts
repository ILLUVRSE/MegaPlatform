import { describe, expect, it } from "vitest";
import { evaluatePerformerAvatarSwitching } from "@/lib/performerAvatarSwitching";

describe("performer avatar switching", () => {
  it("preserves identity and session continuity during switches", async () => {
    const result = await evaluatePerformerAvatarSwitching({
      switchLatencyMs: 250,
      identityTokenStable: true,
      sessionIdStable: true,
      stateCarryoverComplete: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.switchReady).toBe(true);
    expect(result.identityContinuityMet).toBe(true);
  });
});
