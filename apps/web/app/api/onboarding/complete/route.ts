import { prisma } from "@illuvrse/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { apiForbidden, apiInvalidPayload, apiUnauthorized } from "@/lib/apiError";

const payloadSchema = z.object({
  step: z.enum(["started", "completed", "first_action"]),
  actionHref: z.string().min(1).max(240).optional(),
  componentId: z.string().min(1).max(80).optional(),
  interactionMs: z.number().int().min(0).max(120000).optional(),
  userState: z
    .object({
      status: z.enum(["new", "active", "completed", "dismissed"]),
      selectedAction: z.string().min(1).max(120).nullable().optional(),
      hasCompletedAction: z.boolean().optional()
    })
    .optional()
});

function sanitizeSegment(value: string) {
  return value.replace(/[^a-z0-9/_-]+/gi, "-").replace(/-+/g, "-").replace(/^[-/]+|[-/]+$/g, "").toLowerCase();
}

function buildModule(role: string, componentId?: string, interactionMs?: number, userState?: z.infer<typeof payloadSchema>["userState"]) {
  const segments = [
    "Onboarding",
    role,
    componentId ? `cmp_${sanitizeSegment(componentId) || "unknown"}` : null,
    userState ? `usr_${userState.status}` : null,
    userState?.selectedAction ? `act_${sanitizeSegment(userState.selectedAction.replace(/^\//, "").replace(/\//g, "_")) || "none"}` : "act_none",
    typeof userState?.hasCompletedAction === "boolean" ? (userState.hasCompletedAction ? "done_1" : "done_0") : null,
    typeof interactionMs === "number" ? `ms_${interactionMs}` : null
  ].filter(Boolean);

  return segments.join(":").slice(0, 120);
}

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
        module: buildModule(principal.role, parsed.data.componentId, parsed.data.interactionMs, parsed.data.userState),
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
