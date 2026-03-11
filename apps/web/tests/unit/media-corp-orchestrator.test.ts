import { runMediaCorpCycle } from "@illuvrse/media-corp-orchestrator";

describe("media corp orchestrator", () => {
  it("runs an end-to-end cycle with portfolio state and publish plans", async () => {
    const result = await runMediaCorpCycle({ now: "2026-03-07T12:00:00.000Z" });

    expect(result.summary.trendBriefsCreated).toBeGreaterThanOrEqual(3);
    expect(result.summary.seedsCreated).toBe(result.worldState.seeds.length);
    expect(result.worldState.canonRecords.length).toBe(result.worldState.seeds.length);
    expect(result.worldState.contentPlans.length).toBeGreaterThan(result.worldState.seeds.length);
    expect(result.worldState.publishPlans.length).toBeGreaterThan(0);
    expect(result.worldState.agentRuns.length).toBeGreaterThan(10);
  });
});
