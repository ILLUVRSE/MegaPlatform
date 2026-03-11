import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  ownershipVerified: z.boolean(),
  entitlementProofPresent: z.boolean(),
  upgradeCost: z.number().nonnegative(),
  userBalance: z.number(),
  ledgerFieldCount: z.number().int().nonnegative()
});

const policySchema = z.object({
  requireEntitlementProof: z.boolean(),
  requireOwnershipForUpgrades: z.boolean(),
  minimumLedgerFields: z.number().int().positive(),
  allowNegativeBalance: z.boolean(),
  maxUpgradeCost: z.number().nonnegative()
});

const fallback = {
  requireEntitlementProof: true,
  requireOwnershipForUpgrades: true,
  minimumLedgerFields: 4,
  allowNegativeBalance: false,
  maxUpgradeCost: 5000
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "avatar-economy-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAvatarEconomyV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const entitlementCompliant = !policy.requireEntitlementProof || parsed.data.entitlementProofPresent;
  const ownershipCompliant = !policy.requireOwnershipForUpgrades || parsed.data.ownershipVerified;
  const upgradeCostCompliant = parsed.data.upgradeCost <= policy.maxUpgradeCost;
  const balanceCompliant =
    policy.allowNegativeBalance || parsed.data.userBalance - parsed.data.upgradeCost >= 0;
  const ledgerCompliant = parsed.data.ledgerFieldCount >= policy.minimumLedgerFields;

  return {
    ok: true as const,
    economyFlowCompliant:
      entitlementCompliant && ownershipCompliant && upgradeCostCompliant && balanceCompliant && ledgerCompliant,
    entitlementCompliant,
    ownershipCompliant,
    upgradeCostCompliant,
    balanceCompliant,
    ledgerCompliant
  };
}
