import { describe, expect, it } from "vitest";
import { appendModelOutputProvenance } from "@/lib/modelOutputProvenance";

describe("model output provenance ledger", () => {
  it("records lineage with required input and decision context", async () => {
    const result = await appendModelOutputProvenance({
      outputId: "out-135",
      outputKind: "plan",
      inputs: [
        { kind: "prompt", ref: "prompt-1" },
        { kind: "policy", ref: "policy-1" },
        { kind: "context", ref: "context-1" }
      ],
      decision: {
        decisionId: "dec-1",
        decisionSource: "autonomy-control-plane-v3"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.outputId).toBe("out-135");
  });
});
