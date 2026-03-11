import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  incompatiblePairs: z.array(z.string().min(1)).min(1),
  defaultResolution: z.enum(["allow", "deny"]),
  blockOnUnknownLicense: z.boolean()
});

const requestSchema = z.object({
  compositionId: z.string().min(1),
  sourceLicenses: z.array(z.string().min(1)).min(1),
  intendedUse: z.string().min(1)
});

type LicensingPolicy = z.infer<typeof policySchema>;

const defaultPolicy: LicensingPolicy = {
  incompatiblePairs: ["all-rights-reserved|remix", "cc-by-nc|commercial", "proprietary|copyleft"],
  defaultResolution: "allow",
  blockOnUnknownLicense: true
} as const;

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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "dynamic-licensing-resolver.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function resolveDynamicLicensing(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  if (policy.blockOnUnknownLicense && parsed.data.sourceLicenses.some((license) => license === "unknown")) {
    return { ok: true as const, compatible: false, reasons: ["unknown_license_blocked"] };
  }

  const reasons: string[] = [];
  for (const license of parsed.data.sourceLicenses) {
    const pair = `${license}|${parsed.data.intendedUse}`;
    if (policy.incompatiblePairs.includes(pair)) reasons.push(pair);
  }

  if (reasons.length > 0) {
    return { ok: true as const, compatible: false, reasons };
  }

  return { ok: true as const, compatible: policy.defaultResolution === "allow", reasons: [] as string[] };
}
