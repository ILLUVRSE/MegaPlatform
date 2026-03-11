import { describe, expect, it } from "vitest";
import { listDisputes, upsertDispute } from "@/lib/disputeResolutionAutomation";

describe("dispute resolution automation", () => {
  it("records disputes with deterministic workflow states", async () => {
    const result = await upsertDispute({
      disputeId: "disp-159",
      claimantId: "creator-a",
      subjectId: "asset-1",
      evidenceRefs: ["evidence-a"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dispute.state).toBe("intake");

    const disputes = await listDisputes();
    expect(disputes.disputes.length).toBeGreaterThan(0);
  });
});
