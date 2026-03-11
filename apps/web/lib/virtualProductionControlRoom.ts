import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  exposedControlSurfaces: z.array(z.string().min(1)),
  pendingCueDepth: z.number().int().nonnegative(),
  moderationStateLinked: z.boolean(),
  stateAuditTrailEnabled: z.boolean()
});

const policySchema = z.object({
  requiredControlSurfaces: z.array(z.string().min(1)).min(1),
  maxPendingCueDepth: z.number().int().positive(),
  requireStateAuditability: z.boolean()
});

const fallback = {
  requiredControlSurfaces: ["cues", "camera", "effects", "moderation"],
  maxPendingCueDepth: 20,
  requireStateAuditability: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "virtual-production-control-room.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateVirtualProductionControlRoom(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const missingControlSurfaces = policy.requiredControlSurfaces.filter((surface) => !parsed.data.exposedControlSurfaces.includes(surface));
  const pendingCueDepthWithinLimit = parsed.data.pendingCueDepth <= policy.maxPendingCueDepth;
  const moderationCoverageMet = parsed.data.moderationStateLinked && parsed.data.exposedControlSurfaces.includes("moderation");
  const auditabilityMet = !policy.requireStateAuditability || parsed.data.stateAuditTrailEnabled;

  return {
    ok: true as const,
    controlRoomReady: missingControlSurfaces.length === 0 && pendingCueDepthWithinLimit && moderationCoverageMet && auditabilityMet,
    missingControlSurfaces,
    pendingCueDepthWithinLimit,
    moderationCoverageMet,
    auditabilityMet
  };
}
