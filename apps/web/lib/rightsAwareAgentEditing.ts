import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  blockedLicenseStates: z.array(z.string().min(1)).min(1),
  requiredRights: z.array(z.string().min(1)).min(1),
  requireAttribution: z.boolean(),
  maxPendingClaims: z.number().int().nonnegative()
});

const requestSchema = z.object({
  assetId: z.string().min(1),
  licenseState: z.string().min(1),
  grantedRights: z.array(z.string().min(1)),
  hasAttribution: z.boolean(),
  pendingClaims: z.number().int().nonnegative()
});

const defaultPolicy = {
  blockedLicenseStates: ["unknown", "expired", "disputed"],
  requiredRights: ["derivative", "distribution"],
  requireAttribution: true,
  maxPendingClaims: 0
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "rights-aware-agent-editing-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function enforceRightsAwareEditing(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const missingRights = policy.requiredRights.filter((right) => !parsed.data.grantedRights.includes(right));

  const blockers = [
    policy.blockedLicenseStates.includes(parsed.data.licenseState) ? "blocked_license_state" : null,
    missingRights.length > 0 ? "missing_required_rights" : null,
    policy.requireAttribution && !parsed.data.hasAttribution ? "missing_attribution" : null,
    parsed.data.pendingClaims > policy.maxPendingClaims ? "pending_claims_exceeded" : null
  ].filter((value): value is string => Boolean(value));

  return {
    ok: true as const,
    allowed: blockers.length === 0,
    blockers,
    missingRights
  };
}
