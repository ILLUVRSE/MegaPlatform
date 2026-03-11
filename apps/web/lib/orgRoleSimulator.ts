import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const roleSchema = z.object({
  id: z.enum(["ops", "product", "safety", "growth"]),
  displayName: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  taskTemplates: z.array(z.string().min(1)).min(1)
});

const simulatorPolicySchema = z.object({
  roles: z.array(roleSchema).min(1),
  maxTasksPerRole: z.number().int().positive()
});

const scenarioSchema = z.object({
  scenario: z.string().min(1),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
  modules: z.array(z.string().min(1)).default([])
});

const defaultPolicy: z.infer<typeof simulatorPolicySchema> = {
  roles: [
    {
      id: "ops",
      displayName: "Ops",
      objectives: ["stability"],
      taskTemplates: ["triage {{scenario}}"]
    }
  ],
  maxTasksPerRole: 2
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export async function loadOrgRoleSimulatorPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "org-role-simulator.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = simulatorPolicySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function renderTemplate(template: string, scenario: string) {
  return template.replaceAll("{{scenario}}", scenario);
}

export async function runOrgRoleSimulation(rawInput: unknown) {
  const parsed = scenarioSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input", outputs: [] };

  const policy = await loadOrgRoleSimulatorPolicy();
  const outputs = policy.roles.map((role) => {
    const tasks = role.taskTemplates.slice(0, policy.maxTasksPerRole).map((template, index) => ({
      id: `${role.id}-task-${index + 1}`,
      role: role.id,
      title: renderTemplate(template, parsed.data.scenario),
      urgency: parsed.data.urgency,
      modules: parsed.data.modules,
      rationale: `${role.displayName} objective alignment: ${role.objectives.join(", ")}`
    }));

    return {
      role: role.id,
      displayName: role.displayName,
      objectives: role.objectives,
      tasks
    };
  });

  return {
    ok: true as const,
    scenario: parsed.data.scenario,
    urgency: parsed.data.urgency,
    modules: parsed.data.modules,
    outputs,
    generatedAt: new Date().toISOString()
  };
}
