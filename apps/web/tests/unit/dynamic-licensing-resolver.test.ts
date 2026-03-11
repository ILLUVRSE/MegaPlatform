import { describe, expect, it } from "vitest";
import { resolveDynamicLicensing } from "@/lib/dynamicLicensingResolver";

describe("dynamic licensing resolver", () => {
  it("allows compatible license/use combinations", async () => {
    const result = await resolveDynamicLicensing({
      compositionId: "comp-156",
      sourceLicenses: ["cc-by"],
      intendedUse: "remix"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compatible).toBe(true);
  });

  it("blocks incompatible license/use combinations", async () => {
    const result = await resolveDynamicLicensing({
      compositionId: "comp-156-bad",
      sourceLicenses: ["cc-by-nc"],
      intendedUse: "commercial"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compatible).toBe(false);
  });
});
