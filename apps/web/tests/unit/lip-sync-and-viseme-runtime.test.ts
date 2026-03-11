import { describe, expect, it } from "vitest";
import { evaluateLipSyncAndVisemeRuntime } from "@/lib/lipSyncAndVisemeRuntime";

describe("lip-sync and viseme runtime", () => {
  it("keeps viseme timeline integration stable", async () => {
    const result = await evaluateLipSyncAndVisemeRuntime({
      visemeTimeline: [
        { viseme: "AA", timestampMs: 0 },
        { viseme: "EE", timestampMs: 20 },
        { viseme: "OO", timestampMs: 40 },
        { viseme: "MBP", timestampMs: 60 },
        { viseme: "FV", timestampMs: 80 }
      ],
      timelineDriftMs: 18,
      coverage: 0.98
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stableIntegration).toBe(true);
    expect(result.missingVisemes).toEqual([]);
  });
});
