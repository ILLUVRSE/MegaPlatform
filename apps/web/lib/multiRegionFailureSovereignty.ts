import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  primaryRegions: z.array(z.string().min(1)).min(1),
  requiredControlStates: z.array(z.string().min(1)).min(1),
  maxUnavailablePrimaries: z.number().int().nonnegative(),
  degradedModeActionLimit: z.enum(["normal", "restricted", "halted"])
});

const requestSchema = z.object({
  regions: z.array(
    z.object({
      id: z.string().min(1),
      available: z.boolean(),
      controlStates: z.array(z.string().min(1))
    })
  )
});

const defaultPolicy = {
  primaryRegions: ["us-east-1", "us-west-2"],
  requiredControlStates: ["constraint_enforced", "guardrails_active"],
  maxUnavailablePrimaries: 1,
  degradedModeActionLimit: "restricted" as const
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "multi-region-failure-sovereignty.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateMultiRegionFailureSovereignty(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const regionMap = new Map(parsed.data.regions.map((region) => [region.id, region]));
  const primaryStatuses = policy.primaryRegions.map((regionId) => ({
    regionId,
    available: regionMap.get(regionId)?.available ?? false,
    controlStates: regionMap.get(regionId)?.controlStates ?? []
  }));

  const unavailablePrimaries = primaryStatuses.filter((region) => !region.available).length;
  const missingControls = primaryStatuses
    .filter((region) => region.available)
    .flatMap((region) =>
      policy.requiredControlStates
        .filter((requiredState) => !region.controlStates.includes(requiredState))
        .map((requiredState) => `${region.regionId}:${requiredState}`)
    );

  const sovereign = unavailablePrimaries <= policy.maxUnavailablePrimaries && missingControls.length === 0;

  return {
    ok: true as const,
    sovereign,
    unavailablePrimaries,
    missingControls,
    actionLimit: sovereign ? "normal" : policy.degradedModeActionLimit,
    primaryStatuses
  };
}
