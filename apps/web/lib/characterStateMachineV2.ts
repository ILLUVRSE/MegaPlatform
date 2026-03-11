import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ fromState: z.string().min(1), toState: z.string().min(1) });
const policySchema = z.object({
  allowedTransitions: z.record(z.string(), z.array(z.string())),
  blockedTransitions: z.array(z.tuple([z.string().min(1), z.string().min(1)]))
});

const fallback = {
  allowedTransitions: {
    idle: ["walk", "interact"],
    walk: ["idle", "run", "interact"],
    run: ["walk", "idle"],
    interact: ["idle"]
  },
  blockedTransitions: [["run", "interact"]] as Array<[string, string]>
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "character-state-machine-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCharacterStateMachineV2(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const allowedTargets = policy.allowedTransitions[parsed.data.fromState] ?? [];
  const blocked = policy.blockedTransitions.some(([from, to]) => from === parsed.data.fromState && to === parsed.data.toState);
  const validTransition = !blocked && allowedTargets.includes(parsed.data.toState);

  return {
    ok: true as const,
    validTransition,
    invalidTransitionBlocked: !validTransition,
    fromState: parsed.data.fromState,
    toState: parsed.data.toState
  };
}
