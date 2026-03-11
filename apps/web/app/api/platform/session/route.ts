import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { resolveIdentityContext } from "@/lib/identity";
import { getPlatformSessionGraph, resolvePlatformSessionKey, upsertPlatformSessionGraph } from "@/lib/platformSessionGraph";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions).catch(() => null);
  const principal = session?.user ? { userId: session.user.id, role: session.user.role ?? null } : null;
  const identity = resolveIdentityContext({ request, principal });
  const creator = identity.userId
    ? await ensureCreatorProfile({
        id: identity.userId,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null
      })
    : null;
  const graph = await getPlatformSessionGraph({
    ...identity,
    creatorProfileId: creator?.id ?? null
  });

  return NextResponse.json({ ok: true, session: graph });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions).catch(() => null);
  const principal = session?.user ? { userId: session.user.id, role: session.user.role ?? null } : null;
  const identity = resolveIdentityContext({ request, principal });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const creator = identity.userId
    ? await ensureCreatorProfile({
        id: identity.userId,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null
      })
    : null;
  const sessionKey = resolvePlatformSessionKey({
    ...identity,
    creatorProfileId: creator?.id ?? null
  });

  const graph = await upsertPlatformSessionGraph({
    userId: identity.userId,
    anonId: identity.anonId,
    profileId: identity.profileId,
    creatorProfileId: creator?.id ?? null,
    sessionKey,
    currentModule: typeof body.currentModule === "string" ? body.currentModule : "home",
    activeTask: typeof body.activeTask === "string" ? body.activeTask : null,
    partyCode: typeof body.partyCode === "string" ? body.partyCode : null,
    squadId: typeof body.squadId === "string" ? body.squadId : null,
    state: typeof body.state === "object" && body.state ? (body.state as Record<string, unknown>) : {},
    href: typeof body.href === "string" ? body.href : "/",
    action: typeof body.action === "string" ? body.action : "update"
  });

  return NextResponse.json({ ok: true, session: graph });
}
