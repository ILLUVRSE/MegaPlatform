import type { PrismaClient } from "@illuvrse/db";
import { buildComplianceStatus } from "@/lib/platformGovernance";
import { loadRetentionEvidence } from "@/lib/dataRetention";
import { loadDsarEvidence } from "@/lib/dsar";
import { buildKeyRotationStatus } from "@/lib/keyRotation";

type PrismaLike = Pick<PrismaClient, "$queryRaw">;

export async function buildComplianceScorecard(prisma: PrismaLike) {
  const [complianceStatus, retentionEvidence, dsarEvidence, keyRotation] = await Promise.all([
    buildComplianceStatus(prisma),
    loadRetentionEvidence(),
    loadDsarEvidence(),
    buildKeyRotationStatus()
  ]);

  const controls = complianceStatus.controls.map((control) => ({
    id: control.id,
    name: control.name,
    pass: control.pass,
    required: control.required,
    evidencePath: control.evidencePath,
    owner: control.owner
  }));

  controls.push({
    id: "retention-job-evidence",
    name: "Data Retention Evidence",
    pass: retentionEvidence.length > 0,
    required: true,
    evidencePath: "docs/compliance/evidence/data-retention-runs.json",
    owner: "Legal/Compliance"
  });

  controls.push({
    id: "dsar-evidence",
    name: "DSAR Workflow Evidence",
    pass: dsarEvidence.length > 0,
    required: true,
    evidencePath: "docs/compliance/evidence/dsar-requests.json",
    owner: "Support + Legal"
  });

  controls.push({
    id: "key-rotation-compliance",
    name: "Key Rotation Compliance",
    pass: keyRotation.overdue.length === 0,
    required: true,
    evidencePath: "ops/governance/key-rotation.json",
    owner: "Security"
  });

  return {
    controls,
    summary: {
      total: controls.length,
      passed: controls.filter((item) => item.pass).length,
      failed: controls.filter((item) => !item.pass).length
    },
    generatedAt: new Date().toISOString()
  };
}
