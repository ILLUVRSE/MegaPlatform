export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";
import { FEED_TRUST_POLICY, isSevereReportReason } from "@/lib/feedPolicy";

const reportSchema = z.object({
  reason: z.string().trim().min(2).max(120),
  details: z.string().trim().max(500).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const { anonId, shouldSetCookie } = ensureAnonId(request);

  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const createdAt = new Date();
  const report = await prisma.feedReport.create({
    data: {
      postId: id,
      reporterId: userId,
      anonId: userId ? null : anonId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      createdAt
    }
  });

  const unresolved = await prisma.feedReport.findMany({
    where: {
      postId: id,
      resolvedAt: null
    },
    select: {
      reporterId: true,
      anonId: true
    }
  });

  const uniqueReporterSet = new Set(
    unresolved
      .map((entry) => entry.reporterId ?? entry.anonId)
      .filter((value): value is string => Boolean(value))
  );
  const unresolvedCount = unresolved.length;
  const uniqueReporterCount = uniqueReporterSet.size;

  const severeReason = isSevereReportReason(parsed.data.reason);
  const shouldShadowban =
    unresolvedCount >= FEED_TRUST_POLICY.shadowbanUnresolvedReportsThreshold ||
    uniqueReporterCount >= FEED_TRUST_POLICY.shadowbanUniqueReporterThreshold ||
    (severeReason && uniqueReporterCount >= FEED_TRUST_POLICY.severeReasonShadowbanUniqueReporterThreshold);
  const shouldHide =
    shouldShadowban ||
    unresolvedCount >= FEED_TRUST_POLICY.hideUnresolvedReportsThreshold ||
    uniqueReporterCount >= FEED_TRUST_POLICY.hideUniqueReporterThreshold;

  if (shouldHide || shouldShadowban) {
    await prisma.feedPost.update({
      where: { id },
      data: {
        ...(shouldHide ? { isHidden: true } : {}),
        ...(shouldShadowban ? { isShadowbanned: true } : {})
      }
    });
  }

  const response = NextResponse.json(
    {
      id: report.id,
      moderation: {
        unresolvedCount,
        uniqueReporterCount,
        autoHidden: shouldHide,
        autoShadowbanned: shouldShadowban
      }
    },
    { status: 201 }
  );
  return attachAnonCookie(response, anonId, shouldSetCookie);
}
