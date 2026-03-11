export const dynamic = "force-dynamic";

/**
 * Shorts purchase stub API.
 * POST: -> { ok: true }
 * Guard: none; uses anon cookie if no auth.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { attachAnonCookie, ensureAnonId } from "@/lib/anon";
import { canPurchaseItem } from "@/lib/monetizationRules";
import { applyCreatorProgressEvent } from "@/lib/creatorProgression";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const short = await prisma.shortPost.findUnique({
    where: { id },
    select: { id: true, isPremium: true, price: true, createdById: true, projectId: true }
  });
  if (!short) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const purchaseDecision = canPurchaseItem({ isPremium: short.isPremium, price: short.price ?? null });
  if (purchaseDecision.reason === "already_free") {
    return NextResponse.json({ ok: true, alreadyAccessible: true });
  }
  if (!purchaseDecision.allowed) {
    return NextResponse.json({ error: "Short is not purchasable" }, { status: 409 });
  }
  const purchasePrice = purchaseDecision.price ?? 0;

  const session = await getServerSession(authOptions);
  const buyerId = session?.user?.id ?? null;

  const response = NextResponse.json({ ok: true, price: purchasePrice });

  let buyerAnonId: string | null = null;
  if (!buyerId) {
    const { anonId, shouldSetCookie } = ensureAnonId(request);
    buyerAnonId = anonId;
    attachAnonCookie(response, anonId, shouldSetCookie);
  }

  const existing = await prisma.shortPurchase.findFirst({
    where: {
      shortPostId: id,
      ...(buyerId ? { buyerId } : { buyerAnonId })
    }
  });

  if (!existing) {
    const purchase = await prisma.shortPurchase.create({
      data: {
        shortPostId: id,
        buyerId,
        buyerAnonId
      }
    });
    response.headers.set("x-short-purchase-id", purchase.id);

    if (short.createdById) {
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: short.createdById },
        select: { id: true }
      });
      if (creatorProfile) {
        await prisma.revenueAttribution.create({
          data: {
            creatorProfileId: creatorProfile.id,
            shortPostId: short.id,
            projectId: short.projectId ?? null,
            actionType: "short_purchase",
            eventSource: "api/shorts/purchase",
            revenueCents: purchasePrice,
            metadataJson: {
              buyerType: buyerId ? "user" : "anon",
              buyerId: buyerId ?? null,
              buyerAnonId: buyerAnonId ?? null
            }
          }
        });
        await applyCreatorProgressEvent({
          creatorProfileId: creatorProfile.id,
          source: "short_purchase",
          points: Math.max(10, Math.floor(purchasePrice / 20)),
          metadataJson: {
            shortPostId: short.id,
            projectId: short.projectId ?? null,
            revenueCents: purchasePrice
          }
        });
      }
    }
  }

  return response;
}
