import { describe, expect, it } from "vitest";
import { readUserAgencyControls, upsertUserAgencyControls } from "@/lib/userAgencyControls";

describe("user agency controls v2", () => {
  it("persists a user agency preference profile", async () => {
    const result = await upsertUserAgencyControls({
      userId: "user-142",
      autonomyMode: "balanced",
      topicOptOuts: ["gambling"],
      maxPersonalizationIntensity: 0.6,
      allowCrossSurfaceContinuity: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const controls = await readUserAgencyControls();
    const profile = controls.profiles.find((entry) => (entry as { userId?: string }).userId === "user-142");
    expect(profile).toBeTruthy();
  });

  it("rejects preferences that violate policy caps", async () => {
    const result = await upsertUserAgencyControls({
      userId: "user-142-invalid",
      autonomyMode: "balanced",
      topicOptOuts: [],
      maxPersonalizationIntensity: 0.95,
      allowCrossSurfaceContinuity: false
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("intensity_above_policy_cap");
  });
});
