import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const portabilityPolicySchema = z.object({
  maxAssetsPerRequest: z.number().int().positive(),
  maxPayloadBytes: z.number().int().positive()
});

const exportPayloadSchema = z.object({
  profile: z.object({
    handle: z.string().min(1),
    displayName: z.string().min(1)
  }),
  assets: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.string().min(1),
      url: z.string().min(1)
    })
  )
});

const defaultPolicy = {
  maxAssetsPerRequest: 200,
  maxPayloadBytes: 2_000_000
};

export async function loadCreatorPortabilityPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "creator-portability.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = portabilityPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildCreatorExportPayload(userId: string) {
  return {
    profile: {
      handle: `creator-${userId}`,
      displayName: `Creator ${userId}`
    },
    assets: [
      {
        id: "asset-1",
        kind: "video",
        url: "https://assets.illuvrse.local/asset-1.mp4"
      }
    ]
  };
}

export async function validateCreatorImportPayload(payload: unknown) {
  const policy = await loadCreatorPortabilityPolicy();
  const parsed = exportPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, reason: "invalid_payload" };

  if (parsed.data.assets.length > policy.maxAssetsPerRequest) {
    return { ok: false as const, reason: "asset_limit_exceeded" };
  }
  const bytes = Buffer.byteLength(JSON.stringify(parsed.data), "utf-8");
  if (bytes > policy.maxPayloadBytes) {
    return { ok: false as const, reason: "payload_too_large" };
  }

  return { ok: true as const, payload: parsed.data };
}
