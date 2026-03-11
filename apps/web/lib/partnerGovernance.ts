import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const partnerPolicySchema = z.object({
  partnerId: z.string().min(1),
  allowedModules: z.array(z.string().min(1)).min(1),
  requiresDataSharingAgreement: z.boolean(),
  status: z.enum(["active", "suspended"])
});

const defaultPolicies = [
  {
    partnerId: "partner-alpha",
    allowedModules: ["news", "artAtlas"],
    requiresDataSharingAgreement: true,
    status: "active" as const
  }
];

export async function loadPartnerGovernancePolicies() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "partner-governance.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(partnerPolicySchema).safeParse(parsed);
    if (!result.success) return defaultPolicies;
    return result.data;
  } catch {
    return defaultPolicies;
  }
}

export async function evaluatePartnerActivation(input: { partnerId: string; moduleKey: string; hasAgreement: boolean }) {
  const policies = await loadPartnerGovernancePolicies();
  const policy = policies.find((item) => item.partnerId === input.partnerId);
  if (!policy) return { ok: false as const, reason: "partner_not_found" };
  if (policy.status !== "active") return { ok: false as const, reason: "partner_not_active" };
  if (!policy.allowedModules.includes(input.moduleKey)) return { ok: false as const, reason: "module_not_allowed" };
  if (policy.requiresDataSharingAgreement && !input.hasAgreement) {
    return { ok: false as const, reason: "data_sharing_agreement_required" };
  }
  return { ok: true as const, policy };
}
