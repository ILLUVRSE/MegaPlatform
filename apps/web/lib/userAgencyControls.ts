import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  maxProfiles: z.number().int().positive(),
  allowedAutonomyModes: z.array(z.string().min(1)).min(1),
  maxPersonalizationIntensityCap: z.number().min(0).max(1),
  maxTopicOptOuts: z.number().int().nonnegative()
});

const profileSchema = z.object({
  userId: z.string().min(1),
  autonomyMode: z.string().min(1),
  topicOptOuts: z.array(z.string().min(1)),
  maxPersonalizationIntensity: z.number().min(0).max(1),
  allowCrossSurfaceContinuity: z.boolean()
});

const defaultPolicy = {
  outputPath: "ops/logs/user-agency-controls-v2.json",
  maxProfiles: 5000,
  allowedAutonomyModes: ["balanced", "exploratory", "strict"],
  maxPersonalizationIntensityCap: 0.85,
  maxTopicOptOuts: 30
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "user-agency-controls-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readStore(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.profiles)) return { profiles: [] as unknown[] };
    return parsed;
  } catch {
    return { profiles: [] as unknown[] };
  }
}

export async function upsertUserAgencyControls(rawProfile: unknown) {
  const parsed = profileSchema.safeParse(rawProfile);
  if (!parsed.success) return { ok: false as const, reason: "invalid_profile" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  if (!policy.allowedAutonomyModes.includes(parsed.data.autonomyMode)) {
    return { ok: false as const, reason: "unsupported_autonomy_mode" };
  }
  if (parsed.data.maxPersonalizationIntensity > policy.maxPersonalizationIntensityCap) {
    return { ok: false as const, reason: "intensity_above_policy_cap" };
  }
  if (parsed.data.topicOptOuts.length > policy.maxTopicOptOuts) {
    return { ok: false as const, reason: "topic_opt_out_limit_exceeded" };
  }

  const store = await readStore(root, policy.outputPath);
  const nextProfiles = [
    parsed.data,
    ...store.profiles.filter((profile) => (profile as { userId?: string }).userId !== parsed.data.userId)
  ]
    .slice(0, policy.maxProfiles)
    .sort((left, right) => {
      const leftValue = (left as { userId?: string }).userId ?? "";
      const rightValue = (right as { userId?: string }).userId ?? "";
      return leftValue.localeCompare(rightValue);
    });

  const normalized = {
    profiles: nextProfiles
  };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");

  return { ok: true as const, profile: parsed.data, profileCount: normalized.profiles.length };
}

export async function readUserAgencyControls() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readStore(root, policy.outputPath);
}
