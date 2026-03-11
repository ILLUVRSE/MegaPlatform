import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { createSpatialTelemetryEvent } from "@/lib/spatialTelemetryTaxonomyV1";

const policySchema = z.object({
  supportedRuntimes: z.array(z.enum(["openxr", "webxr"])).min(1),
  requiredCoreCapabilities: z.array(z.string().min(1)).min(1),
  coreRoutes: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  requestedRuntime: z.enum(["openxr", "webxr"]),
  adapterVersion: z.string().min(1),
  capabilities: z.array(z.string().min(1)),
  coreRoutesUsingContract: z.array(z.string().min(1))
});

const fallback = {
  supportedRuntimes: ["openxr", "webxr"] as const,
  requiredCoreCapabilities: ["pose_tracking", "frame_loop", "input_intents"],
  coreRoutes: ["/xr/session/start", "/xr/session/state", "/xr/input/dispatch"]
};

const runtimeAdapterMap: Record<"openxr" | "webxr", string> = {
  openxr: "openxr-adapter-v1",
  webxr: "webxr-adapter-v1"
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "openxr-webxr-contract-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateXrContractV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const runtimeSupported = policy.supportedRuntimes.includes(parsed.data.requestedRuntime);
  const missingCapabilities = policy.requiredCoreCapabilities.filter(
    (capability) => !parsed.data.capabilities.includes(capability)
  );
  const uncoveredCoreRoutes = policy.coreRoutes.filter(
    (route) => !parsed.data.coreRoutesUsingContract.includes(route)
  );
  const telemetryEvent = await createSpatialTelemetryEvent({
    module: "xr_contract",
    eventType: "session",
    action: "contract_validate",
    payload: { runtime: parsed.data.requestedRuntime, missingCapabilities: missingCapabilities.length }
  });

  return {
    ok: true as const,
    contractValid: runtimeSupported && missingCapabilities.length === 0 && uncoveredCoreRoutes.length === 0,
    selectedAdapter: runtimeAdapterMap[parsed.data.requestedRuntime],
    adapterVersion: parsed.data.adapterVersion,
    runtimeSupported,
    missingCapabilities,
    uncoveredCoreRoutes,
    telemetryEvent: telemetryEvent.ok ? telemetryEvent.event : null
  };
}
