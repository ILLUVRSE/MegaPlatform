import { describe, expect, it } from "vitest";
import { orchestrateHapticsV1 } from "@/lib/hapticsOrchestrationV1";

describe("haptics orchestration v1", () => {
  it("maps reusable haptic profiles by capability and context", async () => {
    const result = await orchestrateHapticsV1({ profile: "confirm", deviceCapabilities: ["haptics"], runtimeContext: "menu_select" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selected.durationMs).toBe(40);
  });
});
