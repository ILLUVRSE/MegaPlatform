import { describe, expect, it } from "vitest";
import { evaluateRealTimeEventModerationXr } from "@/lib/realTimeEventModerationXr";

describe("real-time event moderation xr", () => {
  it("enforces low-latency policy-bound and auditable moderation actions", async () => {
    const result = await evaluateRealTimeEventModerationXr({
      moderationLatencyMs: 120,
      auditRecordWritten: true,
      policyDecisionIdPresent: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moderationReady).toBe(true);
    expect(result.latencyMet).toBe(true);
  });
});
