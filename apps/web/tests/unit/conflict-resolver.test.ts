import { describe, expect, it } from "vitest";
import { resolveAgentConflict } from "@/lib/conflictResolver";

describe("inter-agent conflict resolver", () => {
  it("resolves conflicting proposals deterministically", async () => {
    const result = await resolveAgentConflict([
      {
        agent: "growth",
        objective: "ctr",
        action: "ship aggressive ranking",
        effect: "allow",
        rationale: "expected +8% ctr"
      },
      {
        agent: "safety",
        objective: "policy compliance",
        action: "block ranking change",
        effect: "deny",
        rationale: "unsafe false-positive risk"
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.winner.agent).toBe("safety");
    expect(result.trace.reason.includes("deny precedence")).toBe(true);
  });
});
