import { describe, expect, it } from "vitest";
import { runCollectiveDeliberation } from "@/lib/collectiveAgentDeliberationProtocol";

describe("collective agent deliberation protocol", () => {
  it("produces deterministic transcript and auditable resolution", async () => {
    const payload = {
      decisionId: "d1",
      positions: [
        { agentId: "b", stance: "approve" as const, rationale: "ok" },
        { agentId: "a", stance: "approve" as const, rationale: "safe" },
        { agentId: "c", stance: "reject" as const, rationale: "cost" }
      ]
    };
    const first = await runCollectiveDeliberation(payload);
    const second = await runCollectiveDeliberation(payload);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.transcriptDigest).toBe(second.transcriptDigest);
  });
});
