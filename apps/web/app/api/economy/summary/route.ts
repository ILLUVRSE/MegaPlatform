import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { getPlatformEconomySummary } from "@/lib/platformEconomy";

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id ?? null;
  const creator = userId
    ? await ensureCreatorProfile({
        id: userId,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null
      })
    : null;

  const summary = await getPlatformEconomySummary({
    userId,
    anonId: userId ? null : "home-guest",
    profileId: null,
    creatorProfileId: creator?.id ?? null
  });

  return NextResponse.json({ ok: true, summary });
}
