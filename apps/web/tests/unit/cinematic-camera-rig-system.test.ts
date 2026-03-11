import { describe, expect, it } from "vitest";
import { evaluateCinematicCameraRigSystem } from "@/lib/cinematicCameraRigSystem";

describe("cinematic camera rig system", () => {
  it("supports reusable camera primitives across scene and cutscene flows", async () => {
    const result = await evaluateCinematicCameraRigSystem({
      primitiveCount: 4,
      rigSwitchLatencyMs: 90,
      reusedInScenePipeline: true,
      reusedInCutscenePipeline: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.systemReady).toBe(true);
    expect(result.crossPipelineReusable).toBe(true);
  });
});
