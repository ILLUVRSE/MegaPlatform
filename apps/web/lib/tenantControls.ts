import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const tenantPolicySchema = z.object({
  defaultTenant: z.string().min(1),
  tenants: z
    .array(
      z.object({
        id: z.string().min(1),
        allowedPathPrefixes: z.array(z.string().min(1)).min(1),
        allowedModules: z.array(z.string().min(1)).min(1)
      })
    )
    .min(1)
});

const defaultPolicy = {
  defaultTenant: "core",
  tenants: [
    {
      id: "core",
      allowedPathPrefixes: ["/api", "/apps"],
      allowedModules: ["news", "gamegrid", "pixelbrawl", "art-atlas", "watch", "shorts", "party", "studio", "games"]
    }
  ]
};

export type MultiTenantPolicy = z.infer<typeof tenantPolicySchema>;

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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export async function loadMultiTenantPolicy() {
  const root = await findRepoRoot();
  const fullPath = path.join(root, "ops", "governance", "multi-tenant-controls.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = tenantPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

function normalizeModuleKey(value: string) {
  return value.trim().toLowerCase();
}

export async function authorizeTenantBoundary(
  input: {
    tenantId?: string;
    requestPath: string;
    moduleKey?: string;
    rowTenantId?: string;
  },
  policyOverride?: MultiTenantPolicy
) {
  const policy = policyOverride ?? (await loadMultiTenantPolicy());
  const tenantId = input.tenantId?.trim() || policy.defaultTenant;
  const tenant = policy.tenants.find((row) => row.id === tenantId);
  if (!tenant) return { ok: false as const, reason: "tenant_not_found" };

  const pathAllowed = tenant.allowedPathPrefixes.some((prefix) => input.requestPath.startsWith(prefix));
  if (!pathAllowed) return { ok: false as const, reason: "path_not_allowed" };

  if (input.moduleKey) {
    const moduleAllowed = tenant.allowedModules.map(normalizeModuleKey).includes(normalizeModuleKey(input.moduleKey));
    if (!moduleAllowed) return { ok: false as const, reason: "module_not_allowed" };
  }

  if (input.rowTenantId && input.rowTenantId !== tenant.id) {
    return { ok: false as const, reason: "data_tenant_mismatch" };
  }

  return { ok: true as const, tenantId: tenant.id };
}
