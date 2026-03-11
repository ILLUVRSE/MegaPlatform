import { describe, expect, it, vi } from "vitest";
import { buildComplianceScorecard } from "@/lib/complianceScorecard";

vi.mock("@/lib/platformGovernance", () => ({
  buildComplianceStatus: vi.fn().mockResolvedValue({
    controls: [
      {
        id: "privacy-retention-policy",
        name: "Privacy and Retention Policy",
        owner: "Legal/Compliance",
        evidencePath: "docs/compliance/privacy-retention.md",
        required: true,
        pass: true
      }
    ]
  })
}));

describe("compliance scorecard", () => {
  it("returns machine-readable controls with evidence pointers", async () => {
    const prisma = { $queryRaw: vi.fn() } as never;
    const scorecard = await buildComplianceScorecard(prisma);
    expect(scorecard.controls.length).toBeGreaterThan(1);
    expect(scorecard.controls.every((item) => typeof item.evidencePath === "string")).toBe(true);
  });
});
