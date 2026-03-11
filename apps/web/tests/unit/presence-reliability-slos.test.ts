import { describe, expect, it } from "vitest";
import { evaluatePresenceReliabilitySLOs } from "@/lib/presenceReliabilitySLOs";

describe("presence reliability slos", () => {
  it("emits SLO breaches and alert surfaces", async () => {
    const result = await evaluatePresenceReliabilitySLOs({ sessionUptime: 0.99, syncLossRate: 0.02 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slosMet).toBe(false);
    expect(result.alertRequired).toBe(true);
    expect(result.alertSurfaces).toEqual(["admin_dashboard", "incident_channel"]);
  });
});
