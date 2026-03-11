import { prisma } from "@illuvrse/db";
import type { SessionGraphIdentity } from "@/lib/platformSessionGraph";

const db = prisma as any;

function buildAudienceWhere(identity: SessionGraphIdentity) {
  return {
    OR: [
      identity.userId ? { userId: identity.userId } : undefined,
      identity.anonId ? { anonId: identity.anonId } : undefined,
      identity.creatorProfileId ? { creatorProfileId: identity.creatorProfileId } : undefined
    ].filter(Boolean)
  };
}

export async function seedPlatformInbox(identity: SessionGraphIdentity) {
  const audience = buildAudienceWhere(identity);
  const count = await db.platformNotification.count({ where: audience });
  if (count > 0) return;

  const rows = [
    {
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      kind: "resume",
      title: "Resume your last platform session",
      body: "Jump back into the current cross-app flow without losing context.",
      href: "/",
      source: "session_graph",
      actionLabel: "Resume"
    },
    {
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      kind: "party_invite",
      title: "Start a squad watch party",
      body: "Bring your current context into Party with one click.",
      href: "/party",
      source: "party",
      actionLabel: "Launch Party"
    },
    {
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      kind: "creator_task",
      title: "Review creator control center",
      body: "Progression, earnings, and tasks are now centralized.",
      href: "/studio/control-center",
      source: "creator_control_center",
      actionLabel: "Open"
    }
  ];

  await db.platformNotification.createMany({
    data: rows
  });
}

export async function getPlatformInbox(identity: SessionGraphIdentity) {
  await seedPlatformInbox(identity);
  const rows = await db.platformNotification.findMany({
    where: buildAudienceWhere(identity),
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    source: row.source,
    status: row.status,
    actionLabel: row.actionLabel,
    createdAt: row.createdAt.toISOString()
  }));
}

export async function markPlatformNotification(
  notificationId: string,
  status: "READ" | "ARCHIVED" | "ACTED"
) {
  return db.platformNotification.update({
    where: { id: notificationId },
    data: {
      status,
      actedAt: status === "ACTED" ? new Date() : null
    }
  });
}
