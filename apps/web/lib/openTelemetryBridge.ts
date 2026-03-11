import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { PLATFORM_EVENT_NAMES } from "@/lib/platformEvents";

const taxonomyEventSet = new Set<string>(Object.values(PLATFORM_EVENT_NAMES));

const mappingSchema = z.object({
  source: z.string().min(1),
  event: z.string().min(1),
  canonicalEvent: z.string().min(1),
  canonicalSurface: z.string().min(1),
  moduleStrategy: z.enum(["source", "payload", "fixed"]),
  fixedModule: z.string().min(1).optional()
});

const policySchema = z.object({
  enabledSources: z.array(z.string().min(1)).min(1),
  mappings: z.array(mappingSchema).min(1)
});

const inputSchema = z.object({
  source: z.string().min(1),
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().optional()
});

const defaultPolicy = {
  enabledSources: ["partner-analytics"],
  mappings: [
    {
      source: "partner-analytics",
      event: "external_module_open",
      canonicalEvent: PLATFORM_EVENT_NAMES.moduleOpen,
      canonicalSurface: "apps_directory",
      moduleStrategy: "payload" as const
    }
  ]
};

export type OpenTelemetryBridgePolicy = z.infer<typeof policySchema>;
export type OpenTelemetryBridgeInput = z.infer<typeof inputSchema>;

export async function loadOpenTelemetryBridgePolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "open-telemetry-bridge.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function bridgeExternalTelemetry(
  body: unknown,
  policyOverride?: OpenTelemetryBridgePolicy
): Promise<
  | {
      ok: true;
      canonical: {
        event: string;
        module: string;
        href: string;
        surface: string;
        occurredAt?: string;
      };
    }
  | { ok: false; reason: string }
> {
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return { ok: false, reason: "invalid_payload" };

  const input = parsed.data;
  const policy = policyOverride ?? (await loadOpenTelemetryBridgePolicy());
  if (!policy.enabledSources.includes(input.source)) {
    return { ok: false, reason: "source_not_enabled" };
  }

  const mapping = policy.mappings.find((row) => row.source === input.source && row.event === input.event);
  if (!mapping) {
    return { ok: false, reason: "mapping_not_found" };
  }

  if (!taxonomyEventSet.has(mapping.canonicalEvent)) {
    return { ok: false, reason: "invalid_canonical_event" };
  }

  const payloadModule =
    typeof input.payload?.module === "string" && input.payload.module.trim() !== "" ? input.payload.module : null;

  const module =
    mapping.moduleStrategy === "payload"
      ? payloadModule ?? input.source
      : mapping.moduleStrategy === "fixed"
        ? mapping.fixedModule ?? input.source
        : input.source;

  const payloadHref = typeof input.payload?.href === "string" ? input.payload.href : null;
  const payloadPath = typeof input.payload?.path === "string" ? input.payload.path : null;
  const href = payloadHref ?? payloadPath ?? `/apps/${input.source}`;

  return {
    ok: true,
    canonical: {
      event: mapping.canonicalEvent,
      module,
      href,
      surface: mapping.canonicalSurface,
      occurredAt: input.occurredAt
    }
  };
}
