import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import type { PrismaClient } from "@illuvrse/db";
import { buildLaunchReadiness } from "@/lib/platformGovernance";
import { buildKeyRotationStatus } from "@/lib/keyRotation";
import { evaluateSupplyChainRisk } from "@/lib/supplyChain";

const certificationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean(),
  checkKey: z.enum(["launch_blockers", "key_rotation_overdue", "supply_chain_blockers"])
});

type CertificationRule = z.infer<typeof certificationRuleSchema>;
type PrismaLike = Pick<PrismaClient, "$queryRaw">;

const defaultRules: CertificationRule[] = [
  { id: "cert-launch-readiness", name: "Launch Critical Blockers", required: true, checkKey: "launch_blockers" },
  { id: "cert-key-rotation", name: "Key Rotation Compliance", required: true, checkKey: "key_rotation_overdue" },
  { id: "cert-supply-chain", name: "Supply Chain Blockers", required: true, checkKey: "supply_chain_blockers" }
];

async function loadCertificationRules() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "production-certification.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(certificationRuleSchema).safeParse(parsed);
    if (!result.success) return defaultRules;
    return result.data;
  } catch {
    return defaultRules;
  }
}

export async function buildProductionCertificationStatus(prisma: PrismaLike) {
  const [rules, launch, keyRotation, supplyChain] = await Promise.all([
    loadCertificationRules(),
    buildLaunchReadiness(prisma),
    buildKeyRotationStatus(),
    evaluateSupplyChainRisk()
  ]);

  const observed = {
    launch_blockers: launch.blockers.length,
    key_rotation_overdue: keyRotation.overdue.length,
    supply_chain_blockers: supplyChain.blockerCount
  };

  const checks = rules.map((rule) => ({
    ...rule,
    observed: observed[rule.checkKey],
    pass: observed[rule.checkKey] === 0
  }));

  const blockers = checks.filter((check) => check.required && !check.pass);

  return {
    checks,
    blockers,
    certifiable: blockers.length === 0,
    generatedAt: new Date().toISOString()
  };
}
