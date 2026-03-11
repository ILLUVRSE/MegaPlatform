import { describe, expect, it } from "vitest";
import { evaluateResilienceCertification } from "@/lib/resilienceCertification";

describe("resilience certification v1", () => {
  it("certifies when required resilience criteria are satisfied", async () => {
    const result = await evaluateResilienceCertification({
      incidentClassesCovered: ["service_outage", "security_event", "data_integrity"],
      checks: {
        red_team: { passRate: 0.9, criticalFindings: 0 },
        incident_replay: { passRate: 0.85 },
        region_sovereignty: { sovereign: true }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.certified).toBe(true);
  });
});
