import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  publishOperational: z.boolean(),
  versioningOperational: z.boolean(),
  reuseOperational: z.boolean()
});

const policySchema = z.object({
  requireVersionedTemplates: z.boolean(),
  requireReuseLifecycle: z.boolean()
});

const fallback = { requireVersionedTemplates: true, requireReuseLifecycle: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-template-marketplace.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateSpatialTemplateMarketplace(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const versioningReady = !policy.requireVersionedTemplates || parsed.data.versioningOperational;
  const reuseReady = !policy.requireReuseLifecycle || parsed.data.reuseOperational;

  return {
    ok: true as const,
    marketplaceReady: parsed.data.publishOperational && versioningReady && reuseReady,
    versioningReady,
    reuseReady
  };
}
