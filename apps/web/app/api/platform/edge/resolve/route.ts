import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveEdgeRoute } from "@/lib/edgeDelivery";

const payloadSchema = z.object({
  modulePath: z.string().min(1),
  region: z.string().min(2).optional()
});

export async function POST(req: Request) {
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const route = await resolveEdgeRoute(parsed.data);
  return NextResponse.json({ ok: true, route });
}
