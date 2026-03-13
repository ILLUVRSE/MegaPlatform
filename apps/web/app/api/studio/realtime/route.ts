export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  mergeStudioAssetMetadata,
  snapshotStudioDocument,
  submitStudioTextOperation,
  updateStudioPresence
} from "@/lib/studio/collab";
import { withTracedRoute } from "@/lib/traceMiddleware";

const realtimeRequestSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("presence"),
    docId: z.string().min(1),
    payload: z.object({
      clientId: z.string().min(1),
      userId: z.string().min(1),
      name: z.string().min(1).optional(),
      cursor: z
        .object({
          field: z.string().min(1),
          position: z.number().int().min(0),
          selectionEnd: z.number().int().min(0).optional()
        })
        .optional()
    })
  }),
  z.object({
    event: z.literal("text_operation"),
    docId: z.string().min(1),
    payload: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("insert"),
        opId: z.string().min(1),
        clientId: z.string().min(1),
        field: z.string().min(1),
        baseVersion: z.number().int().min(0),
        index: z.number().int().min(0),
        text: z.string()
      }),
      z.object({
        type: z.literal("delete"),
        opId: z.string().min(1),
        clientId: z.string().min(1),
        field: z.string().min(1),
        baseVersion: z.number().int().min(0),
        index: z.number().int().min(0),
        length: z.number().int().min(0)
      })
    ])
  }),
  z.object({
    event: z.literal("asset_metadata"),
    docId: z.string().min(1),
    payload: z.object({
      assetId: z.string().min(1),
      clientId: z.string().min(1),
      userId: z.string().min(1),
      baseVersion: z.number().int().min(0),
      changes: z.record(z.unknown())
    })
  })
]);

export async function GET(request: Request) {
  return withTracedRoute(
    request,
    {
      name: "http.request.studio.realtime.snapshot",
      attributes: {
        "illuvrse.flow": "studio.realtime.snapshot"
      }
    },
    async () => {
      const { searchParams } = new URL(request.url);
      const docId = searchParams.get("docId");

      if (!docId) {
        return NextResponse.json({ error: "docId is required" }, { status: 400 });
      }

      return NextResponse.json({ snapshot: snapshotStudioDocument(docId) });
    }
  );
}

export async function POST(request: Request) {
  return withTracedRoute(
    request,
    {
      name: "http.request.studio.realtime.event",
      attributes: {
        "illuvrse.flow": "studio.realtime.event"
      }
    },
    async () => {
      const body = await request.json().catch(() => null);
      const parsed = realtimeRequestSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      if (parsed.data.event === "presence") {
        return NextResponse.json({
          ok: true,
          event: parsed.data.event,
          snapshot: updateStudioPresence(parsed.data.docId, parsed.data.payload)
        });
      }

      if (parsed.data.event === "text_operation") {
        const result = submitStudioTextOperation(parsed.data.docId, parsed.data.payload);
        return NextResponse.json({ ok: true, event: parsed.data.event, ...result });
      }

      const result = mergeStudioAssetMetadata(parsed.data.docId, parsed.data.payload);
      return NextResponse.json({ ok: true, event: parsed.data.event, ...result });
    }
  );
}
