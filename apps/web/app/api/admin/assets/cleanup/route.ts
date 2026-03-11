import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { deleteObject } from "@illuvrse/storage";
import { requireAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const cleanupSchema = z.object({
  days: z.number().int().min(1).max(365),
  dryRun: z.boolean().default(true),
  deleteFromStorage: z.boolean().default(true),
  continueOnStorageError: z.boolean().default(true),
  maxBatch: z.number().int().min(1).max(1000).default(500)
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = cleanupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const cutoff = new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000);
  const candidates = await prisma.studioAsset.findMany({
    where: {
      temporary: true,
      createdAt: { lt: cutoff }
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      url: true,
      storageKey: true,
      createdAt: true
    },
    take: parsed.data.maxBatch
  });

  if (parsed.data.dryRun) {
    return NextResponse.json({
      dryRun: true,
      count: candidates.length,
      assets: candidates
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ dryRun: false, deleted: 0, storageDeleted: 0, storageFailed: 0, assets: [] });
  }

  const storageFailures: Array<{ id: string; storageKey: string; error: string }> = [];
  const deletableIds: string[] = [];

  for (const asset of candidates) {
    if (!parsed.data.deleteFromStorage || !asset.storageKey) {
      deletableIds.push(asset.id);
      continue;
    }

    try {
      await deleteObject(asset.storageKey);
      deletableIds.push(asset.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Storage delete failed";
      storageFailures.push({ id: asset.id, storageKey: asset.storageKey, error: message });
      if (!parsed.data.continueOnStorageError) {
        return NextResponse.json(
          { error: "Storage cleanup failed", failures: storageFailures },
          { status: 502 }
        );
      }
    }
  }

  const deleted = await prisma.studioAsset.deleteMany({
    where: { id: { in: deletableIds } }
  });

  await writeAudit(
    auth.session.user.id,
    "assets:cleanup",
    `Deleted ${deleted.count} temporary assets older than ${parsed.data.days} day(s); storageFailures=${storageFailures.length}`
  );

  return NextResponse.json({
    dryRun: false,
    deleted: deleted.count,
    storageDeleted: parsed.data.deleteFromStorage ? deletableIds.length : 0,
    storageFailed: storageFailures.length,
    failures: storageFailures,
    assets: candidates
  });
}
