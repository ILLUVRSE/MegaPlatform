export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createCreatorTip } from "@/lib/creator/economy";

export async function POST(request: Request) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const payload = await request.json().catch(() => null);

  const result = await createCreatorTip({
    ...(payload ?? {}),
    ipAddress: payload?.ipAddress ?? ipAddress,
    userAgent: payload?.userAgent ?? userAgent
  });

  if (!result.ok) {
    const status = result.reason === "insufficient_balance" ? 409 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
}
