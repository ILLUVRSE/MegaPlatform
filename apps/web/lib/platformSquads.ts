import { prisma } from "@illuvrse/db";
import type { SessionGraphIdentity } from "@/lib/platformSessionGraph";

const db = prisma as any;

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function ensureDefaultSquad(identity: SessionGraphIdentity & { displayName: string }) {
  if (!identity.userId && !identity.anonId) return null;

  const existing = await db.squad.findFirst({
    where: {
      members: {
        some: identity.userId ? { userId: identity.userId } : { anonId: identity.anonId ?? "" }
      }
    },
    include: { members: true, invites: true }
  });
  if (existing) return existing;

  const slugBase = normalizeSlug(`${identity.displayName}-squad`) || "illuvrse-squad";
  const squad = await db.squad.create({
    data: {
      slug: `${slugBase}-${Date.now().toString().slice(-6)}`,
      name: `${identity.displayName}'s Squad`,
      ownerId: identity.userId ?? null,
      members: {
        create: {
          userId: identity.userId ?? null,
          anonId: identity.anonId ?? null,
          displayName: identity.displayName,
          role: "owner"
        }
      }
    },
    include: { members: true, invites: true }
  });

  return squad;
}

export async function getSquadOverview(identity: SessionGraphIdentity & { displayName: string }) {
  const squad = await ensureDefaultSquad(identity);
  if (!squad) return null;

  if (squad.invites.length === 0) {
    await db.squadInvite.create({
      data: {
        squadId: squad.id,
        inviterUserId: identity.userId ?? null,
        inviteeUserId: identity.userId ?? null,
        inviteeAnonId: identity.anonId ?? null,
        inviteeLabel: identity.displayName,
        targetModule: "party",
        targetHref: "/party",
        message: "Continue together in Party."
      }
    });
  }

  const refreshed = await db.squad.findUnique({
    where: { id: squad.id },
    include: { members: true, invites: { orderBy: { createdAt: "desc" }, take: 5 } }
  });

  return refreshed;
}
