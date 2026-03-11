export const dynamic = "force-dynamic";

/**
 * Watch my list API.
 * GET: -> { items }
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";
import { apiUnauthorized } from "@/lib/apiError";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  const profileId = getProfileIdFromCookie(request.headers.get("cookie"));
  if (!profileId) {
    return apiUnauthorized("Select profile");
  }

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id }
  });
  if (!profile) {
    return apiUnauthorized("Invalid profile");
  }

  const items = await prisma.myListItem.findMany({
    where: { profileId: profile.id },
    include: { profile: true }
  });

  const showIds = items.map((item) => item.showId).filter(Boolean) as string[];
  const shows = await prisma.show.findMany({ where: { id: { in: showIds } } });
  const showMap = new Map(shows.map((show) => [show.id, show]));

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      mediaType: item.mediaType,
      show: item.showId ? showMap.get(item.showId) ?? null : null
    }))
  });
}
