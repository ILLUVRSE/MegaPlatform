import { describe, expect, it } from "vitest";
import { runAutomatedControlTestingV2 } from "@/lib/automatedControlTestingV2";

describe("automated control testing v2", () => {
  it("emits pass/fail evidence outputs", async () => {
    const result = await runAutomatedControlTestingV2({ results: { access_control: true, retention_control: false, audit_logging: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.fail).toContain("retention_control");
  });
});
