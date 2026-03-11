import { z } from "zod";
import { OPS_ROLES } from "@/lib/ops";

const ROLE_KEYS = OPS_ROLES as unknown as [string, ...string[]];

const taskTextSchema = z.string().trim().min(1).max(280);

const sectionsSchema = z
  .record(z.enum(ROLE_KEYS), z.array(taskTextSchema).max(40))
  .transform((value) => {
    const normalized: Record<string, string[]> = {};
    for (const role of OPS_ROLES) {
      const tasks = value[role] ?? [];
      normalized[role] = tasks.map((task) => task.trim()).filter(Boolean);
    }
    return normalized;
  });

export const opsBriefingPayloadSchema = z.object({
  sections: sectionsSchema,
  notes: z.string().max(4000).optional(),
  destructiveOk: z.boolean().optional()
});

export type OpsBriefingPayload = z.infer<typeof opsBriefingPayloadSchema>;
