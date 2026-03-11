export const dynamic = "force-dynamic";

/**
 * Shorts access API.
 * GET: -> { hasAccess }
 * Guard: none; uses anon cookie if no auth.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canPurchaseItem } from "@/lib/monetizationRules";

const ANON_COOKIE = "ILLUVRSE_ANON_ID";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.shortPost.findUnique({
    where: { id },
    select: { id: true, isPremium: true, price: true }
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const purchaseDecision = canPurchaseItem({ isPremium: post.isPremium, price: post.price ?? null });
  if (purchaseDecision.reason === "already_free") {
    return NextResponse.json({ hasAccess: true, requiresPurchase: false, price: null });
  }

  const session = await getServerSession(authOptions);
  const buyerId = session?.user?.id ?? null;

  let buyerAnonId: string | null = null;
  if (!buyerId) {
    const cookie = request.headers.get("cookie") ?? "";
    const match = cookie.match(new RegExp(`${ANON_COOKIE}=([^;]+)`));
    buyerAnonId = match?.[1] ?? null;
  }

  if (!buyerId && !buyerAnonId) {
    return NextResponse.json({ hasAccess: false, requiresPurchase: true, price: purchaseDecision.allowed ? purchaseDecision.price : null });
  }

  const purchase = await prisma.shortPurchase.findFirst({
    where: {
      shortPostId: id,
      ...(buyerId ? { buyerId } : { buyerAnonId })
    }
  });

  return NextResponse.json({
    hasAccess: Boolean(purchase),
    requiresPurchase: !purchase,
    price: purchaseDecision.allowed ? purchaseDecision.price : null
  });
}
