export const dynamic = "force-dynamic";

/**
 * Minigame party room creation API.
 * POST: { playerName } -> { code, playerId, hostId }
 */
import { NextResponse } from "next/server";
import { createMinigamePartyRoom } from "@/lib/minigame/party/service";
import { createRoomSchema } from "@/lib/minigame/party/validation";
import { withTracedRoute } from "@/lib/traceMiddleware";

export async function POST(request: Request) {
  return withTracedRoute(
    request,
    {
      name: "http.request.party.minigolf.create",
      attributes: {
        "illuvrse.flow": "party.minigolf.create"
      }
    },
    async () => {
      const body = await request.json();
      const parsed = createRoomSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      try {
        const result = await createMinigamePartyRoom(parsed.data.playerName);
        return NextResponse.json(result);
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }
  );
}
