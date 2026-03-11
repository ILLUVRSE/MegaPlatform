import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { externalModuleManifestSchema, type ExternalModuleManifest } from "@/lib/externalModuleSdk";

const policySchema = z.object({
  requiredChecks: z.array(z.string().min(1)).min(1),
  allowedCategories: z.array(z.enum(["Media", "Games", "Culture"])).min(1),
  allowHttpLocalhost: z.boolean()
});

const defaultPolicy = {
  requiredChecks: ["manifest_valid", "route_prefix", "https_launch_url", "category_allowed"],
  allowedCategories: ["Media", "Games", "Culture"],
  allowHttpLocalhost: true
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export async function loadEcosystemCertificationPolicy() {
  const root = await findRepoRoot();
  const fullPath = path.join(root, "ops", "governance", "ecosystem-certification.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function runModuleCertification(raw: unknown) {
  const policy = await loadEcosystemCertificationPolicy();
  const checks = new Map<string, { pass: boolean; reason?: string }>();

  const manifestParsed = externalModuleManifestSchema.safeParse(raw);
  checks.set("manifest_valid", {
    pass: manifestParsed.success,
    reason: manifestParsed.success ? undefined : "manifest schema validation failed"
  });

  if (!manifestParsed.success) {
    return {
      ok: false as const,
      checks: [...checks.entries()].map(([name, result]) => ({ name, ...result })),
      requiredChecks: policy.requiredChecks
    };
  }

  const manifest: ExternalModuleManifest = manifestParsed.data;
  const routePrefixPass = manifest.route.startsWith("/");
  checks.set("route_prefix", {
    pass: routePrefixPass,
    reason: routePrefixPass ? undefined : "route must start with '/'"
  });

  const launchUrl = new URL(manifest.launchUrl);
  const httpsPass =
    launchUrl.protocol === "https:" || (policy.allowHttpLocalhost && launchUrl.protocol === "http:" && launchUrl.hostname === "localhost");
  checks.set("https_launch_url", {
    pass: httpsPass,
    reason: httpsPass ? undefined : "launchUrl must use https or localhost http"
  });

  const categoryPass = policy.allowedCategories.includes(manifest.category);
  checks.set("category_allowed", {
    pass: categoryPass,
    reason: categoryPass ? undefined : "category not allowed"
  });

  const requiredResults = policy.requiredChecks.map((name) => {
    const result = checks.get(name) ?? { pass: false, reason: "check_not_implemented" };
    return { name, ...result };
  });

  const failedChecks = requiredResults.filter((check) => !check.pass);
  return {
    ok: failedChecks.length === 0,
    checks: requiredResults,
    requiredChecks: policy.requiredChecks,
    moduleId: manifest.id,
    moduleRoute: manifest.route
  };
}
