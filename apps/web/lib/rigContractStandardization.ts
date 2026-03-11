import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const constraintSchema = z.object({ constraintId: z.string().min(1), type: z.string().min(1) });
const requestSchema = z.object({ skeletonType: z.string().min(1), boneCount: z.number().int().positive(), constraints: z.array(constraintSchema) });
const policySchema = z.object({
  supportedSkeletons: z.array(z.string().min(1)).min(1),
  maxBoneCountBySkeleton: z.record(z.string(), z.number().int().positive()),
  allowedConstraintTypes: z.array(z.string().min(1)).min(1),
  blockedConstraintPairs: z.array(z.tuple([z.string().min(1), z.string().min(1)]))
});

const fallback = {
  supportedSkeletons: ["humanoid", "quadruped"],
  maxBoneCountBySkeleton: { humanoid: 256, quadruped: 220 },
  allowedConstraintTypes: ["ik", "fk", "aim", "twist"],
  blockedConstraintPairs: [["ik", "twist"]] as Array<[string, string]>
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "rig-contract-standardization.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateRigContractStandardization(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const { skeletonType, boneCount, constraints } = parsed.data;
  const incompatibleReasons: string[] = [];

  if (!policy.supportedSkeletons.includes(skeletonType)) incompatibleReasons.push("unsupported_skeleton");

  const maxBoneCount = policy.maxBoneCountBySkeleton[skeletonType];
  if (typeof maxBoneCount === "number" && boneCount > maxBoneCount) incompatibleReasons.push("bone_count_exceeds_policy");

  const constraintTypes = constraints.map((constraint) => constraint.type);
  if (constraintTypes.some((type) => !policy.allowedConstraintTypes.includes(type))) {
    incompatibleReasons.push("unsupported_constraint_type");
  }

  for (const [first, second] of policy.blockedConstraintPairs) {
    if (constraintTypes.includes(first) && constraintTypes.includes(second)) {
      incompatibleReasons.push(`blocked_constraint_pair:${first}+${second}`);
    }
  }

  return {
    ok: true as const,
    compatible: incompatibleReasons.length === 0,
    incompatibleReasons: Array.from(new Set(incompatibleReasons)).sort(),
    checkedConstraintCount: constraints.length,
    skeletonType
  };
}
