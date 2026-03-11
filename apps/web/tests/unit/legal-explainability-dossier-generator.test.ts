import { describe, expect, it } from "vitest";
import { generateLegalExplainabilityDossier } from "@/lib/legalExplainabilityDossierGenerator";

describe("legal explainability dossier generator", () => {
  it("produces regulator-ready explainability packets", async () => {
    const result = await generateLegalExplainabilityDossier({ decisionId: "d-179", policyRationale: "policy threshold met", evidenceLinks: ["ev-1"], outcome: "blocked" });
    expect(result.ok).toBe(true);
  });
});
