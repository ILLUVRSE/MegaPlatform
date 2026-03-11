export const dynamic = "force-dynamic";

/**
 * Watch my list toggle API.
 * POST: { mediaType, showId } -> { saved }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";

const toggleSchema = z.object({
  mediaType: z.string().min(1),
  showId: z.string().min(2)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = getProfileIdFromCookie(request.headers.get("cookie"));
  if (!profileId) {
    return NextResponse.json({ error: "Select profile" }, { status: 401 });
  }

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id }
  });
  if (!profile) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.myListItem.findFirst({
    where: {
      profileId: profile.id,
      mediaType: parsed.data.mediaType,
      showId: parsed.data.showId
    }
  });

  if (existing) {
    await prisma.myListItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.myListItem.create({
    data: {
      profileId: profile.id,
      mediaType: parsed.data.mediaType,
      showId: parsed.data.showId
    }
  });

  return NextResponse.json({ saved: true });
}
