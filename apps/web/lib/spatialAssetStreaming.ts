import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxConcurrentStreams: z.number().int().min(1),
  maxResidentMemoryMb: z.number().int().min(64),
  defaultChunkSizeKb: z.number().int().min(32)
});

const requestSchema = z.object({
  assets: z.array(z.object({ id: z.string().min(1), sizeMb: z.number().positive(), priority: z.number().int().min(1).max(10) })).min(1)
});

const fallback = { maxConcurrentStreams: 3, maxResidentMemoryMb: 512, defaultChunkSizeKb: 256 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-asset-streaming.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function planSpatialAssetStreaming(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const sorted = [...parsed.data.assets].sort((a, b) => a.priority - b.priority || a.sizeMb - b.sizeMb || a.id.localeCompare(b.id));
  const streamingQueue = sorted.slice(0, policy.maxConcurrentStreams).map((asset) => ({
    assetId: asset.id,
    chunkSizeKb: policy.defaultChunkSizeKb,
    chunks: Math.ceil((asset.sizeMb * 1024) / policy.defaultChunkSizeKb)
  }));

  const residentMemoryMb = Number(sorted.slice(0, policy.maxConcurrentStreams).reduce((sum, asset) => sum + asset.sizeMb, 0).toFixed(2));

  return {
    ok: true as const,
    incrementalHydration: true,
    streamingQueue,
    residentMemoryMb,
    memoryBounded: residentMemoryMb <= policy.maxResidentMemoryMb
  };
}
