export const dynamic = "force-dynamic";

/**
 * Monetize short API.
 * POST: { isPremium, price? } -> { post }
 * Guard: admin-only.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { canPurchaseItem, normalizePremiumPrice } from "@/lib/monetizationRules";
const monetizeSchema = z.object({
  isPremium: z.boolean(),
  price: z.number().int().min(0).optional().nullable()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = monetizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.isPremium) {
    const purchasable = canPurchaseItem({ isPremium: true, price: parsed.data.price ?? null });
    if (!purchasable.allowed) {
      return NextResponse.json({ error: "Price required for premium shorts" }, { status: 400 });
    }
  }

  const clampedPrice = parsed.data.isPremium ? normalizePremiumPrice(parsed.data.price ?? null) : null;

  const existing = await prisma.shortPost.findUnique({
    where: { id },
    select: { id: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const post = await prisma.shortPost.update({
    where: { id },
    data: {
      isPremium: parsed.data.isPremium,
      price: parsed.data.isPremium ? clampedPrice : null
    }
  });

  return NextResponse.json({ post });
}
