import { describe, expect, it } from "vitest";
import { validateXrContractV1 } from "@/lib/xrContractV1";

describe("openxr webxr contract v1", () => {
  it("validates shared xr contract adapters and core route coverage", async () => {
    const result = await validateXrContractV1({
      requestedRuntime: "webxr",
      adapterVersion: "1.0.0",
      capabilities: ["pose_tracking", "frame_loop", "input_intents", "anchors"],
      coreRoutesUsingContract: ["/xr/session/start", "/xr/session/state", "/xr/input/dispatch"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contractValid).toBe(true);
    expect(result.selectedAdapter).toBe("webxr-adapter-v1");
  });
});
