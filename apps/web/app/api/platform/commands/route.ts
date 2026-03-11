import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { resolveIdentityContext } from "@/lib/identity";
import { getPlatformCommands } from "@/lib/platformCommands";
import { getPlatformSessionGraph } from "@/lib/platformSessionGraph";

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

  const sessionGraph = await getPlatformSessionGraph({
    userId: identity.userId,
    anonId: identity.anonId,
    profileId: identity.profileId,
    creatorProfileId: creator?.id ?? null
  });

  const commands = getPlatformCommands({
    identity,
    session: sessionGraph
  });

  return NextResponse.json({ ok: true, commands });
}
