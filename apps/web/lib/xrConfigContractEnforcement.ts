import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requiredKeys: z.array(z.string().min(1)).min(1),
  allowedRuntimeValues: z.array(z.string().min(1)).min(1),
  minRenderScale: z.number().positive(),
  maxRenderScale: z.number().positive()
});

const requestSchema = z.object({ config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) });

const fallback = {
  requiredKeys: ["XR_RUNTIME", "XR_RENDER_SCALE", "XR_SESSION_TIMEOUT_MS"],
  allowedRuntimeValues: ["openxr", "webxr"],
  minRenderScale: 0.5,
  maxRenderScale: 2
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-config-contract-enforcement.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function enforceXrConfigContract(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const errors: string[] = [];
  for (const key of policy.requiredKeys) {
    if (parsed.data.config[key] === undefined) errors.push(`missing_${key.toLowerCase()}`);
  }

  const runtime = parsed.data.config.XR_RUNTIME;
  if (typeof runtime === "string" && !policy.allowedRuntimeValues.includes(runtime)) errors.push("invalid_xr_runtime");

  const renderScale = Number(parsed.data.config.XR_RENDER_SCALE);
  if (!Number.isFinite(renderScale) || renderScale < policy.minRenderScale || renderScale > policy.maxRenderScale) {
    errors.push("invalid_xr_render_scale");
  }

  return { ok: true as const, valid: errors.length === 0, failFast: errors.length > 0, errors };
}
