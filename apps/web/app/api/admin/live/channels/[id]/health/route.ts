export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const channel = await prisma.liveChannel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  if (!channel.streamUrl) {
    const updated = await prisma.liveChannel.update({
      where: { id },
      data: {
        lastCheckedAt: now,
        lastHealthyAt: channel.isVirtual ? now : null,
        lastError: channel.isVirtual ? null : "No streamUrl configured"
      }
    });
    return NextResponse.json({ ok: channel.isVirtual, channel: updated });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(channel.streamUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    const updated = await prisma.liveChannel.update({
      where: { id },
      data: {
        lastCheckedAt: now,
        lastHealthyAt: response.ok ? now : channel.lastHealthyAt,
        lastError: response.ok ? null : `HTTP ${response.status}`
      }
    });

    return NextResponse.json({ ok: response.ok, channel: updated });
  } catch (error) {
    clearTimeout(timeout);
    const updated = await prisma.liveChannel.update({
      where: { id },
      data: {
        lastCheckedAt: now,
        lastError: error instanceof Error ? error.message : "Health check failed"
      }
    });
    return NextResponse.json({ ok: false, channel: updated });
  }
}
