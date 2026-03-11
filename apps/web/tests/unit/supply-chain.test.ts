import { describe, expect, it } from "vitest";
import { evaluateSupplyChainRisk } from "@/lib/supplyChain";

describe("supply chain evaluation", () => {
  it("returns pass when no unresolved critical blockers exist", async () => {
    const snapshot = await evaluateSupplyChainRisk();
    expect(snapshot.pass).toBe(true);
    expect(snapshot.blockerCount).toBe(0);
  });
});
