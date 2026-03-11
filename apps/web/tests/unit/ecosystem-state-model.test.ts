import { describe, expect, it } from "vitest";
import { buildEcosystemStateModel } from "@/lib/ecosystemStateModel";

describe("ecosystem state model", () => {
  it("produces health and momentum outputs from multi-module signals", async () => {
    const state = await buildEcosystemStateModel();
    expect(["healthy", "degraded", "critical"]).toContain(state.health.state);
    expect(["positive", "stalled"]).toContain(state.momentum.state);
  });
});
