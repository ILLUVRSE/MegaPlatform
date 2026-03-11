import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { getPlatformInbox } from "@/lib/platformInbox";
import { getPlatformEconomySummary } from "@/lib/platformEconomy";
import { getPlatformRecommendations } from "@/lib/platformRecommendations";
import { getPlatformSessionGraph, resolvePlatformSessionKey, upsertPlatformSessionGraph } from "@/lib/platformSessionGraph";
import { getSquadOverview } from "@/lib/platformSquads";

export async function getHomePlatformOverview() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id ?? null;
  let creatorProfileId: string | null = null;

  if (userId) {
    const creator = await ensureCreatorProfile({
      id: userId,
      name: session?.user?.name ?? null,
      email: session?.user?.email ?? null
    });
    creatorProfileId = creator.id;
  }

  const identity = {
    userId,
    anonId: userId ? null : "home-guest",
    profileId: null,
    creatorProfileId
  };
  const sessionKey = resolvePlatformSessionKey(identity);

  const sessionGraph = await upsertPlatformSessionGraph({
    ...identity,
    sessionKey,
    currentModule: "home",
    href: "/",
    action: "home_visit",
    state: { surface: "control_deck" }
  });

  const [inbox, economy, squad, recommendations] = await Promise.all([
    getPlatformInbox(identity),
    getPlatformEconomySummary(identity),
    getSquadOverview({
      ...identity,
      displayName: session?.user?.name?.trim() || "Guest"
    }),
    getPlatformRecommendations({
      identity: {
        userId: identity.userId,
        anonId: identity.anonId,
        profileId: identity.profileId
      },
      session: sessionGraph
    })
  ]);

  return {
    sessionGraph: await getPlatformSessionGraph(identity),
    inbox,
    economy,
    squad: squad
      ? {
          id: squad.id,
          name: squad.name,
          slug: squad.slug,
          memberCount: squad.members.length,
          inviteCount: squad.invites.length
        }
      : null,
    recommendations
  };
}
