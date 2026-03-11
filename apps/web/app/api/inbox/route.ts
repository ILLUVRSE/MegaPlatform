import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureCreatorProfile } from "@/lib/creatorIdentity";
import { resolveIdentityContext } from "@/lib/identity";
import { getPlatformInbox, markPlatformNotification } from "@/lib/platformInbox";

async function resolveAudience(request: Request) {
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

  return {
    userId: identity.userId,
    anonId: identity.anonId ?? "anonymous:guest",
    profileId: identity.profileId,
    creatorProfileId: creator?.id ?? null
  };
}

export async function GET(request: Request) {
  const inbox = await getPlatformInbox(await resolveAudience(request));
  return NextResponse.json({ ok: true, inbox });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.notificationId !== "string" || typeof body.status !== "string") {
    return NextResponse.json({ ok: false, error: "notificationId and status are required" }, { status: 400 });
  }

  const result = await markPlatformNotification(body.notificationId, body.status as "READ" | "ARCHIVED" | "ACTED");
  return NextResponse.json({ ok: true, notification: result });
}
