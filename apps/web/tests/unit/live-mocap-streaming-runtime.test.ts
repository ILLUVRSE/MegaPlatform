import { describe, expect, it } from "vitest";
import { evaluateLiveMocapStreamingRuntime } from "@/lib/liveMocapStreamingRuntime";

describe("live mocap streaming runtime", () => {
  it("feeds runtime with bounded lag behavior", async () => {
    const result = await evaluateLiveMocapStreamingRuntime({ lagMs: 80, jitterMs: 20, packetDropRate: 0.01 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runtimeStable).toBe(true);
    expect(result.boundedLag).toBe(true);
  });
});
