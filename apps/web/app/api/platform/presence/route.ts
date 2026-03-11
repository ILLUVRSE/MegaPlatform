import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { resolveIdentityContext } from "@/lib/identity";
import { heartbeatPlatformPresence } from "@/lib/platformPresence";

export async function POST(request: Request) {
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const presence = await heartbeatPlatformPresence(
    {
      userId: identity.userId,
      anonId: identity.anonId,
      profileId: identity.profileId,
      creatorProfileId: creator?.id ?? null
    },
    {
      module: typeof body.module === "string" ? body.module : "home",
      status: typeof body.status === "string" ? body.status : "active",
      deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel : null,
      metadata: typeof body.metadata === "object" && body.metadata ? (body.metadata as Record<string, unknown>) : {}
    }
  );

  return NextResponse.json({ ok: true, presence });
}
