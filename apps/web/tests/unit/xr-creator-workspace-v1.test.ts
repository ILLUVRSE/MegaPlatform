import { describe, expect, it } from "vitest";
import { evaluateXrCreatorWorkspaceV1 } from "@/lib/xrCreatorWorkspaceV1";

describe("xr creator workspace v1", () => {
  it("supports unified assemble-preview-validate flow", async () => {
    const result = await evaluateXrCreatorWorkspaceV1({
      assembled: true,
      previewReady: true,
      validationReady: true,
      previewStartupMs: 1200
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workspaceReady).toBe(true);
    expect(result.unifiedFlowMet).toBe(true);
  });
});
