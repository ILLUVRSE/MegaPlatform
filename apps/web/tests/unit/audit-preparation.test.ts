import { describe, expect, it } from "vitest";
import { buildAutonomousAuditBundle } from "@/lib/auditPreparation";

describe("autonomous audit preparation", () => {
  it("builds evidence bundle status on demand", async () => {
    const bundle = await buildAutonomousAuditBundle();
    expect(bundle.bundleName.length).toBeGreaterThan(0);
    expect(Array.isArray(bundle.evidence)).toBe(true);
    expect(typeof bundle.missingCount).toBe("number");
  });
});
