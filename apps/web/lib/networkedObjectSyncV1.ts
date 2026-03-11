import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const objectSchema = z.object({ objectId: z.string().min(1), stateVersion: z.number().int().nonnegative(), lastUpdateSkewMs: z.number().int().nonnegative() });
const policySchema = z.object({ authorityModel: z.string().min(1), conflictPolicy: z.string().min(1), maxSkewMs: z.number().int().positive() });
const requestSchema = z.object({ objects: z.array(objectSchema).min(1) });

const fallback = { authorityModel: "server_authoritative", conflictPolicy: "highest_version_wins", maxSkewMs: 120 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "networked-object-sync-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateNetworkedObjectSyncV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const highestVersion = Math.max(...parsed.data.objects.map((object) => object.stateVersion));
  const resolvedObjects = parsed.data.objects
    .filter((object) => object.stateVersion === highestVersion && object.lastUpdateSkewMs <= policy.maxSkewMs)
    .map((object) => object.objectId)
    .sort();

  return {
    ok: true as const,
    authorityModel: policy.authorityModel,
    conflictPolicy: policy.conflictPolicy,
    deterministicSync: true,
    resolvedObjects
  };
}
