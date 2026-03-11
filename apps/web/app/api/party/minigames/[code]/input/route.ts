export const dynamic = "force-dynamic";

/**
 * Minigame party input API.
 * POST: { playerId, t, input } -> { ok }
 */
import { NextResponse } from "next/server";
import { submitMinigameInput } from "@/lib/minigame/party/service";
import { inputSchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await submitMinigameInput(
      params.code,
      parsed.data.playerId,
      parsed.data.input
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
