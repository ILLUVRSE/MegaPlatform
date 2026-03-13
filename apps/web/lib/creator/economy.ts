import { z } from "zod";
import { createTip } from "../../../../packages/payments/core.mjs";

const tipRequestSchema = z.object({
  idempotencyKey: z.string().min(8),
  fanId: z.string().min(1),
  creatorId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("USD"),
  ipAddress: z.string().min(3).optional(),
  deviceId: z.string().min(3).optional(),
  userAgent: z.string().min(3).optional()
});

export async function createCreatorTip(rawInput: unknown) {
  const parsed = tipRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false as const,
      reason: "invalid_tip_request"
    };
  }

  return createTip(parsed.data);
}
