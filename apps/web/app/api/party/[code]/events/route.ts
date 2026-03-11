export const dynamic = "force-dynamic";

/**
 * Party events SSE endpoint.
 * GET: SSE stream of { type, ... } events for seat/playback updates.
 * Guard: none; public read-only stream.
 */
import { prisma } from "@illuvrse/db";
import { subscribe } from "@illuvrse/world-state";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const party = await prisma.party.findUnique({ where: { code: params.code } });
  if (!party) {
    return new Response("Party not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`));
      const heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(`event: heartbeat\ndata: {"ts":"${new Date().toISOString()}"}\n\n`)
        );
      }, 15_000);

      const unsubscribe = await subscribe(party.id, (payload) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      });

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
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
