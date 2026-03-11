export const dynamic = "force-dynamic";

/**
 * Minigame party events SSE endpoint.
 * GET: SSE stream of party updates.
 */
import { getMinigamePartyState, subscribeMinigameParty } from "@illuvrse/world-state";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const state = await getMinigamePartyState(params.code);
  if (!state) {
    return new Response("Room not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`));
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "room_state", state })}\n\n`)
      );

      const unsubscribe = await subscribeMinigameParty(params.code, (payload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      });

      request.signal.addEventListener("abort", () => {
        void unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
