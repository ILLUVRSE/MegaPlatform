import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const supplyChainPolicySchema = z.object({
  failOnSeverity: z.enum(["critical", "high"]),
  blockedPackages: z.array(z.string().min(1)).default([]),
  allowlist: z.array(z.string().min(1)).default([])
});

const vulnerabilityEntrySchema = z.object({
  package: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  fixed: z.boolean(),
  source: z.string().min(1)
});

const defaultPolicy = {
  failOnSeverity: "critical" as const,
  blockedPackages: [] as string[],
  allowlist: [] as string[]
};

export async function loadSupplyChainPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "supply-chain-policy.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = supplyChainPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function loadVulnerabilityReport() {
  const fullPath = path.join(process.cwd(), "ops", "security", "vulnerability-report.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(vulnerabilityEntrySchema).safeParse(parsed);
    if (!result.success) return [];
    return result.data;
  } catch {
    return [];
  }
}

export async function evaluateSupplyChainRisk() {
  const [policy, report] = await Promise.all([loadSupplyChainPolicy(), loadVulnerabilityReport()]);
  const severityRank = new Map([
    ["low", 1],
    ["medium", 2],
    ["high", 3],
    ["critical", 4]
  ]);
  const failThreshold = severityRank.get(policy.failOnSeverity) ?? 4;

  const unresolved = report.filter((item) => !item.fixed);
  const blockedBySeverity = unresolved.filter((item) => (severityRank.get(item.severity) ?? 0) >= failThreshold);
  const blockedByPackage = unresolved.filter(
    (item) => policy.blockedPackages.includes(item.package) && !policy.allowlist.includes(item.package)
  );

  const blockers = [...blockedBySeverity, ...blockedByPackage].filter(
    (item, index, all) => all.findIndex((other) => other.package === item.package && other.source === item.source) === index
  );

  return {
    policy,
    report,
    unresolvedCount: unresolved.length,
    blockerCount: blockers.length,
    blockers,
    pass: blockers.length === 0,
    generatedAt: new Date().toISOString()
  };
}
