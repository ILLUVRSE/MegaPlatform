export const dynamic = "force-dynamic";

/**
 * Watch progress API.
 * GET: -> { items }
 * POST: { episodeId, positionSec, durationSec } -> { progress }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";
import {
  buildEpisodeEntitlementKeys,
  canAccessShow,
  listActiveEntitlementKeysForUser
} from "@/lib/watchEntitlements";
import { resolveWatchRequestRegion } from "@/lib/watchRequestContext";
import { listWatchEpisodeRights, listWatchShowRights, mergeWatchVisibility } from "@/lib/watchRights";
import { readWatchMonetization, resolveWatchMonetization } from "@/lib/watchMonetization";

const progressSchema = z.object({
  episodeId: z.string().min(2),
  positionSec: z.number().int().min(0),
  durationSec: z.number().int().min(0)
});

async function resolveProfile(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const };
  }
  const profileId = getProfileIdFromCookie(request.headers.get("cookie"));
  if (!profileId) {
    return { error: "Select profile" as const };
  }
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id }
  });
  if (!profile) {
    return { error: "Invalid profile" as const };
  }
  return { profile, role: session.user.role ?? "user" };
}

export async function GET(request: Request) {
  const result = await resolveProfile(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const { profile } = result;

  const items = await prisma.watchProgress.findMany({
    where: { profileId: profile.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { episode: { include: { season: { include: { show: true } } } } }
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      positionSec: item.positionSec,
      durationSec: item.durationSec,
      updatedAt: item.updatedAt,
      episode: {
        id: item.episode.id,
        title: item.episode.title,
        description: item.episode.description,
        lengthSeconds: item.episode.lengthSeconds
      },
      show: {
        id: item.episode.season.show.id,
        title: item.episode.season.show.title,
        slug: item.episode.season.show.slug,
        posterUrl: item.episode.season.show.posterUrl
      }
    }))
  });
}

export async function POST(request: Request) {
  const result = await resolveProfile(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const { profile, role } = result;

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const episode = await prisma.episode.findUnique({
    where: { id: parsed.data.episodeId },
    include: { season: { include: { show: true } } }
  });
  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  const [showRightsById, episodeRightsById] = await Promise.all([
    listWatchShowRights([episode.season.show.id]),
    listWatchEpisodeRights([episode.id])
  ]);
  const showRights = showRightsById.get(episode.season.show.id);
  const currentEpisodeRights = episodeRightsById.get(episode.id);
  if (!showRights || !currentEpisodeRights) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const access = canAccessShow(
    {
      monetizationMode: resolveWatchMonetization(
        readWatchMonetization(episode.season.show),
        readWatchMonetization(episode)
      ).monetizationMode,
      maturityRating: episode.season.show.maturityRating,
      visibility: mergeWatchVisibility(showRights.visibility, currentEpisodeRights.visibility),
      allowedRegions: currentEpisodeRights.allowedRegions.length > 0 ? currentEpisodeRights.allowedRegions : showRights.allowedRegions,
      requiresEntitlement: currentEpisodeRights.requiresEntitlement || showRights.requiresEntitlement,
      entitlementKeys: buildEpisodeEntitlementKeys(episode, episode.season.show)
    },
    {
      userId: profile.userId,
      role,
      isKidsProfile: profile.isKids,
      requestRegion: resolveWatchRequestRegion(request.headers),
      activeEntitlementKeys: await listActiveEntitlementKeysForUser(profile.userId)
    }
  );
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const normalizedDuration = Math.max(0, episode.lengthSeconds > 0 ? episode.lengthSeconds : parsed.data.durationSec);
  const normalizedPosition = Math.max(0, Math.min(parsed.data.positionSec, normalizedDuration));
  const nearComplete =
    normalizedDuration > 0 &&
    (normalizedPosition / normalizedDuration >= 0.95 || normalizedDuration - normalizedPosition <= 30);
  if (nearComplete) {
    await prisma.watchProgress.deleteMany({
      where: {
        profileId: profile.id,
        episodeId: parsed.data.episodeId
      }
    });
    return NextResponse.json({ completed: true, progress: null });
  }

  const progress = await prisma.watchProgress.upsert({
    where: {
      profileId_episodeId: {
        profileId: profile.id,
        episodeId: parsed.data.episodeId
      }
    },
    update: {
      positionSec: normalizedPosition,
      durationSec: normalizedDuration
    },
    create: {
      profileId: profile.id,
      episodeId: parsed.data.episodeId,
      positionSec: normalizedPosition,
      durationSec: normalizedDuration
    }
  });

  return NextResponse.json({ progress });
}
