import { prisma } from "@illuvrse/db";
import { resolvePlatformSessionKey, type SessionGraphIdentity } from "@/lib/platformSessionGraph";

const db = prisma as any;

export async function heartbeatPlatformPresence(
  identity: SessionGraphIdentity,
  input: {
    module: string;
    status: string;
    deviceLabel?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const sessionKey = resolvePlatformSessionKey(identity);

  return db.platformPresence.upsert({
    where: {
      sessionKey_module: {
        sessionKey,
        module: input.module
      }
    },
    update: {
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      profileId: identity.profileId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      status: input.status,
      deviceLabel: input.deviceLabel ?? null,
      metadataJson: input.metadata ?? {},
      lastSeenAt: new Date()
    },
    create: {
      sessionKey,
      userId: identity.userId ?? null,
      anonId: identity.anonId ?? null,
      profileId: identity.profileId ?? null,
      creatorProfileId: identity.creatorProfileId ?? null,
      module: input.module,
      status: input.status,
      deviceLabel: input.deviceLabel ?? null,
      metadataJson: input.metadata ?? {},
      lastSeenAt: new Date()
    }
  });
}
