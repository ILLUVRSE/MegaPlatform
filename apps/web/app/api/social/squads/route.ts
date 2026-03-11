import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSquadOverview } from "@/lib/platformSquads";

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id ?? null;
  const overview = await getSquadOverview({
    userId,
    anonId: userId ? null : "home-guest",
    profileId: null,
    creatorProfileId: null,
    displayName: session?.user?.name?.trim() || "Guest"
  });

  return NextResponse.json({ ok: true, squad: overview });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions).catch(() => null);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const overview = await getSquadOverview({
    userId: session?.user?.id ?? null,
    anonId: session?.user?.id ? null : "home-guest",
    profileId: null,
    creatorProfileId: null,
    displayName: typeof body.displayName === "string" ? body.displayName : session?.user?.name?.trim() || "Guest"
  });

  return NextResponse.json({ ok: true, squad: overview });
}
