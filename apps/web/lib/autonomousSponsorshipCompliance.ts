import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requireDisclosureTag: z.boolean(),
  requiredDisclosureMarkers: z.array(z.string().min(1)).min(1),
  blockUndeclaredSponsoredContent: z.boolean(),
  maxHiddenSponsorMentions: z.number().int().nonnegative()
});

const requestSchema = z.object({
  contentId: z.string().min(1),
  sponsored: z.boolean(),
  disclosureTags: z.array(z.string().min(1)),
  hiddenSponsorMentions: z.number().int().nonnegative()
});

const defaultPolicy = {
  requireDisclosureTag: true,
  requiredDisclosureMarkers: ["sponsored", "paid_partnership"],
  blockUndeclaredSponsoredContent: true,
  maxHiddenSponsorMentions: 0
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-sponsorship-compliance.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateAutonomousSponsorshipCompliance(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const hasDisclosureMarker = policy.requiredDisclosureMarkers.some((marker) => parsed.data.disclosureTags.includes(marker));

  const blockers = [
    parsed.data.sponsored && policy.requireDisclosureTag && !hasDisclosureMarker ? "missing_disclosure" : null,
    parsed.data.sponsored && policy.blockUndeclaredSponsoredContent && !hasDisclosureMarker
      ? "undeclared_sponsorship_blocked"
      : null,
    parsed.data.hiddenSponsorMentions > policy.maxHiddenSponsorMentions ? "hidden_sponsor_mentions_exceeded" : null
  ].filter((value): value is string => Boolean(value));

  return {
    ok: true as const,
    compliant: blockers.length === 0,
    blockers
  };
}
