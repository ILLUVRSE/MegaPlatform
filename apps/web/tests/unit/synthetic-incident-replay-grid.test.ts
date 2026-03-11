import { describe, expect, it } from "vitest";
import { runSyntheticIncidentReplay } from "@/lib/syntheticIncidentReplayGrid";

describe("synthetic incident replay grid", () => {
  it("scores replay outcomes against required response fields", async () => {
    const result = await runSyntheticIncidentReplay([
      {
        id: "inc-1",
        severity: "high",
        response: {
          containment: "isolated",
          rollback: "completed",
          comms: "posted"
        }
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.results[0]?.pass).toBe(true);
  });
});
