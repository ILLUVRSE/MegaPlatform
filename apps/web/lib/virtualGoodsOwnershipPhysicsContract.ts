import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  ownerId: z.string().min(1),
  holderId: z.string().min(1),
  transferInProgress: z.boolean(),
  escrowLockActive: z.boolean(),
  concurrentOwnershipClaims: z.number().int().nonnegative(),
  stateVersion: z.number().int().positive()
});

const policySchema = z.object({
  allowCustodialHolderMismatch: z.boolean(),
  maxConcurrentOwnershipClaims: z.number().int().positive(),
  requireTransferLock: z.boolean(),
  requireStateVersionMonotonicity: z.boolean(),
  minimumStateVersion: z.number().int().positive()
});

const fallback = {
  allowCustodialHolderMismatch: true,
  maxConcurrentOwnershipClaims: 1,
  requireTransferLock: true,
  requireStateVersionMonotonicity: true,
  minimumStateVersion: 1
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "virtual-goods-ownership-physics-contract.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateVirtualGoodsOwnershipPhysicsContract(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const ownerHolderConsistent =
    parsed.data.ownerId === parsed.data.holderId ||
    policy.allowCustodialHolderMismatch ||
    parsed.data.transferInProgress;
  const claimsCompliant = parsed.data.concurrentOwnershipClaims <= policy.maxConcurrentOwnershipClaims;
  const transferLockCompliant = !policy.requireTransferLock || !parsed.data.transferInProgress || parsed.data.escrowLockActive;
  const versionCompliant =
    (!policy.requireStateVersionMonotonicity || parsed.data.stateVersion >= policy.minimumStateVersion) &&
    parsed.data.stateVersion >= policy.minimumStateVersion;

  return {
    ok: true as const,
    ownershipStateConsistent: ownerHolderConsistent && claimsCompliant && transferLockCompliant && versionCompliant,
    ownerHolderConsistent,
    claimsCompliant,
    transferLockCompliant,
    versionCompliant
  };
}
