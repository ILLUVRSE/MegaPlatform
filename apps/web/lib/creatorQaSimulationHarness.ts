import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  scenariosReproducible: z.boolean(),
  passFailOutputsAvailable: z.boolean(),
  scenarioRuntimeMs: z.number().nonnegative()
});

const policySchema = z.object({
  requireReproducibleScenarios: z.boolean(),
  requirePassFailOutputs: z.boolean(),
  maxScenarioRuntimeMs: z.number().nonnegative()
});

const fallback = {
  requireReproducibleScenarios: true,
  requirePassFailOutputs: true,
  maxScenarioRuntimeMs: 5000
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "creator-qa-simulation-harness.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCreatorQaSimulationHarness(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const reproducibleMet = !policy.requireReproducibleScenarios || parsed.data.scenariosReproducible;
  const passFailMet = !policy.requirePassFailOutputs || parsed.data.passFailOutputsAvailable;
  const runtimeMet = parsed.data.scenarioRuntimeMs <= policy.maxScenarioRuntimeMs;

  return {
    ok: true as const,
    harnessReady: reproducibleMet && passFailMet && runtimeMet,
    reproducibleMet,
    passFailMet,
    runtimeMet
  };
}
