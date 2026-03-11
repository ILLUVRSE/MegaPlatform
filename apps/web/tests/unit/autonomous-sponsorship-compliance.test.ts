import { describe, expect, it } from "vitest";
import { evaluateAutonomousSponsorshipCompliance } from "@/lib/autonomousSponsorshipCompliance";

describe("autonomous sponsorship compliance", () => {
  it("passes declared sponsored content", async () => {
    const result = await evaluateAutonomousSponsorshipCompliance({
      contentId: "c155",
      sponsored: true,
      disclosureTags: ["sponsored"],
      hiddenSponsorMentions: 0
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compliant).toBe(true);
  });

  it("blocks undeclared sponsorship", async () => {
    const result = await evaluateAutonomousSponsorshipCompliance({
      contentId: "c155-bad",
      sponsored: true,
      disclosureTags: [],
      hiddenSponsorMentions: 1
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compliant).toBe(false);
    expect(result.blockers).toContain("undeclared_sponsorship_blocked");
  });
});
