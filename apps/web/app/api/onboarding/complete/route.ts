import { prisma } from "@illuvrse/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { apiForbidden, apiInvalidPayload, apiUnauthorized } from "@/lib/apiError";

const payloadSchema = z.object({
  step: z.enum(["started", "completed", "first_action"]),
  actionHref: z.string().min(1).max(240).optional()
});

export async function POST(request: Request) {
  try {
    const principal = await requireSession(request);
    const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiInvalidPayload("Invalid onboarding completion payload.");
    }

    const event = `onboarding_${parsed.data.step}`;
    const href = parsed.data.actionHref ?? "/onboarding";
    await prisma.platformEvent.create({
      data: {
        event,
        module: `Onboarding:${principal.role}`,
        href,
        surface: "onboarding_journey"
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401 ? apiUnauthorized("Unauthorized") : apiForbidden("Forbidden");
    }
    return apiInvalidPayload("Unable to store onboarding event.");
  }
}
