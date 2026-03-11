import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  allowedStates: z.array(z.string().min(1)).min(1),
  allowedTransitions: z.record(z.string(), z.array(z.string().min(1))),
  requireOwnerId: z.boolean()
});

const requestSchema = z.object({
  nodeId: z.string().min(1),
  ownerId: z.string().optional(),
  fromState: z.string().min(1),
  toState: z.string().min(1)
});

const fallback = {
  allowedStates: ["created", "active", "paused", "destroyed"],
  allowedTransitions: {
    created: ["active", "destroyed"],
    active: ["paused", "destroyed"],
    paused: ["active", "destroyed"],
    destroyed: []
  },
  requireOwnerId: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "scene-graph-contract-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateSceneGraphContractV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const ownerValid = !policy.requireOwnerId || Boolean(parsed.data.ownerId);
  const fromStateValid = policy.allowedStates.includes(parsed.data.fromState);
  const toStateValid = policy.allowedStates.includes(parsed.data.toState);
  const transitionAllowed = (policy.allowedTransitions[parsed.data.fromState] ?? []).includes(parsed.data.toState);

  return {
    ok: true as const,
    nodeId: parsed.data.nodeId,
    ownerValid,
    fromStateValid,
    toStateValid,
    transitionAllowed,
    valid: ownerValid && fromStateValid && toStateValid && transitionAllowed
  };
}
