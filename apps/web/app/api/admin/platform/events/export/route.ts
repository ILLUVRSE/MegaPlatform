export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { requireAdmin } from "@/lib/rbac";
import { getRangeSince, resolvePlatformRange } from "@/lib/platformAnalytics";

type ExportEventRow = {
  createdAt: Date;
  event: string;
  module: string;
  surface: string;
  href: string;
};

function csvEscape(value: string) {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = resolvePlatformRange(searchParams.get("range") ?? undefined);
  const since = getRangeSince(range);

  const rows = await prisma.$queryRaw<ExportEventRow[]>`
    SELECT "createdAt", "event", "module", "surface", "href"
    FROM "PlatformEvent"
    WHERE "createdAt" >= ${since}
    ORDER BY "createdAt" DESC
  `;

  const header = ["created_at", "event", "module", "surface", "href"];
  const lines = rows.map((row) =>
    [
      new Date(row.createdAt).toISOString(),
      csvEscape(row.event),
      csvEscape(row.module),
      csvEscape(row.surface),
      csvEscape(row.href)
    ].join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `platform-events-${range}-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
