import { describe, expect, it } from "vitest";
import { monitorLongHorizonValueAlignment } from "@/lib/longHorizonValueAlignmentMonitor";

describe("long-horizon value alignment monitor", () => {
  it("measures drift and triggers correction workflow", async () => {
    const result = await monitorLongHorizonValueAlignment({
      missions: [{ id: "mission", targetValue: 0.9, observedValue: 0.5 }]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.maxDrift).toBeGreaterThan(0);
    expect(typeof result.correctionRequired).toBe("boolean");
  });
});
