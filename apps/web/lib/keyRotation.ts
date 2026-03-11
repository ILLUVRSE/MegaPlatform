import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const keyRotationEntrySchema = z.object({
  id: z.string().min(1),
  secretRef: z.string().min(1),
  owner: z.string().min(1),
  maxAgeDays: z.number().int().positive(),
  lastRotatedAt: z.string().min(1)
});

export type KeyRotationEntry = z.infer<typeof keyRotationEntrySchema>;

const defaultEntries: KeyRotationEntry[] = [
  {
    id: "nextauth-secret",
    secretRef: "NEXTAUTH_SECRET",
    owner: "Security",
    maxAgeDays: 90,
    lastRotatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "s3-secret-key",
    secretRef: "S3_SECRET_KEY",
    owner: "Infra",
    maxAgeDays: 90,
    lastRotatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "livekit-api-secret",
    secretRef: "LIVEKIT_API_SECRET",
    owner: "Realtime",
    maxAgeDays: 60,
    lastRotatedAt: "2026-01-15T00:00:00.000Z"
  }
];

export async function loadKeyRotationManifest() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "key-rotation.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(keyRotationEntrySchema).safeParse(parsed);
    if (!result.success) return defaultEntries;
    return result.data;
  } catch {
    return defaultEntries;
  }
}

function ageDays(lastRotatedAt: string, now: Date) {
  const parsed = Date.parse(lastRotatedAt);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  const deltaMs = now.getTime() - parsed;
  return deltaMs / (1000 * 60 * 60 * 24);
}

export async function buildKeyRotationStatus(now = new Date()) {
  const entries = await loadKeyRotationManifest();
  const status = entries.map((entry) => {
    const days = ageDays(entry.lastRotatedAt, now);
    const overdue = days > entry.maxAgeDays;
    return {
      ...entry,
      ageDays: Math.floor(days),
      overdue
    };
  });

  return {
    entries: status,
    overdue: status.filter((item) => item.overdue),
    generatedAt: now.toISOString()
  };
}
