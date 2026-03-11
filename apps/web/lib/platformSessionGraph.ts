import { prisma } from "@illuvrse/db";
import {
  appendPlatformSessionTrail,
  createPlatformSessionState,
  type PlatformSessionState
} from "@illuvrse/world-state";

const db = prisma as any;

export type SessionGraphIdentity = {
  userId?: string | null;
  anonId?: string | null;
  profileId?: string | null;
  creatorProfileId?: string | null;
};

export type PlatformSessionGraphRecord = SessionGraphIdentity & {
  sessionKey: string;
  currentModule: string;
  sourceModule?: string | null;
  sourceHref?: string | null;
  activeTask?: string | null;
  partyCode?: string | null;
  squadId?: string | null;
  state?: Record<string, unknown> | null;
  trail?: Array<{ module: string; href: string; at: string; action?: string }> | null;
};

export function resolvePlatformSessionKey(identity: SessionGraphIdentity) {
  if (identity.userId) return `user:${identity.userId}`;
  if (identity.anonId) return `anon:${identity.anonId}`;
  return "anonymous:guest";
}

export function createDefaultPlatformSession(input: PlatformSessionGraphRecord): PlatformSessionState {
  return createPlatformSessionState({
    sessionKey: input.sessionKey,
    currentModule: input.currentModule,
    sourceModule: input.sourceModule ?? null,
    sourceHref: input.sourceHref ?? null,
    activeTask: input.activeTask ?? null,
    partyCode: input.partyCode ?? null,
    squadId: input.squadId ?? null,
    state: input.state ?? {},
    trail: input.trail ?? []
  });
}

export async function getPlatformSessionGraph(identity: SessionGraphIdentity) {
  const sessionKey = resolvePlatformSessionKey(identity);
  const existing = await db.platformSessionGraph.findUnique({
    where: { sessionKey }
  });

  if (!existing) {
    return createDefaultPlatformSession({
      ...identity,
      sessionKey,
      currentModule: "home",
      sourceHref: "/",
      trail: [{ module: "home", href: "/", at: new Date().toISOString(), action: "bootstrap" }]
    });
  }

  return createDefaultPlatformSession({
    ...identity,
    sessionKey: existing.sessionKey,
    currentModule: existing.currentModule,
    sourceModule: existing.sourceModule,
    sourceHref: existing.sourceHref,
    activeTask: existing.activeTask,
    partyCode: existing.partyCode,
    squadId: existing.squadId,
    state: (existing.stateJson as Record<string, unknown> | null) ?? {},
    trail:
      (existing.trailJson as Array<{ module: string; href: string; at: string; action?: string }> | null) ?? []
  });
}

export async function upsertPlatformSessionGraph(
  input: PlatformSessionGraphRecord & {
    action?: string;
    href?: string;
  }
) {
  const existing = await getPlatformSessionGraph(input);
  const nextState =
    input.href && input.action
      ? appendPlatformSessionTrail(existing, {
          module: input.currentModule,
          href: input.href,
          action: input.action
        })
      : createDefaultPlatformSession({
          ...input,
          trail: input.trail ?? existing.trail
        });

  const mergedState = {
    ...(existing.state ?? {}),
    ...(input.state ?? {})
  };

  await db.platformSessionGraph.upsert({
    where: { sessionKey: input.sessionKey },
    update: {
      userId: input.userId ?? null,
      anonId: input.anonId ?? null,
      profileId: input.profileId ?? null,
      creatorProfileId: input.creatorProfileId ?? null,
      currentModule: input.currentModule,
      sourceModule: nextState.sourceModule ?? input.sourceModule ?? null,
      sourceHref: nextState.sourceHref ?? input.sourceHref ?? null,
      activeTask: input.activeTask ?? null,
      partyCode: input.partyCode ?? null,
      squadId: input.squadId ?? null,
      stateJson: mergedState,
      trailJson: nextState.trail,
      lastActionAt: new Date(),
      updatedAt: new Date()
    },
    create: {
      sessionKey: input.sessionKey,
      userId: input.userId ?? null,
      anonId: input.anonId ?? null,
      profileId: input.profileId ?? null,
      creatorProfileId: input.creatorProfileId ?? null,
      currentModule: input.currentModule,
      sourceModule: nextState.sourceModule ?? input.sourceModule ?? null,
      sourceHref: nextState.sourceHref ?? input.sourceHref ?? null,
      activeTask: input.activeTask ?? null,
      partyCode: input.partyCode ?? null,
      squadId: input.squadId ?? null,
      stateJson: mergedState,
      trailJson: nextState.trail,
      lastActionAt: new Date()
    }
  });

  return {
    ...nextState,
    activeTask: input.activeTask ?? nextState.activeTask ?? null,
    partyCode: input.partyCode ?? nextState.partyCode ?? null,
    squadId: input.squadId ?? nextState.squadId ?? null,
    state: mergedState
  };
}
