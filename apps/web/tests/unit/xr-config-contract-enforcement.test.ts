import { describe, expect, it } from "vitest";
import { enforceXrConfigContract } from "@/lib/xrConfigContractEnforcement";

describe("xr config contract enforcement", () => {
  it("fails fast on invalid xr config with actionable errors", async () => {
    const result = await enforceXrConfigContract({ config: { XR_RUNTIME: "invalid", XR_RENDER_SCALE: 4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.valid).toBe(false);
    expect(result.failFast).toBe(true);
    expect(result.errors).toContain("missing_xr_session_timeout_ms");
  });
});
