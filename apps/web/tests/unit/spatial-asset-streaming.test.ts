import { describe, expect, it } from "vitest";
import { planSpatialAssetStreaming } from "@/lib/spatialAssetStreaming";

describe("spatial asset streaming", () => {
  it("plans incremental hydration with bounded memory", async () => {
    const result = await planSpatialAssetStreaming({
      assets: [
        { id: "a", sizeMb: 120, priority: 1 },
        { id: "b", sizeMb: 80, priority: 2 },
        { id: "c", sizeMb: 60, priority: 3 },
        { id: "d", sizeMb: 300, priority: 8 }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.incrementalHydration).toBe(true);
    expect(result.memoryBounded).toBe(true);
    expect(result.streamingQueue.length).toBe(3);
  });
});
