import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { readTasks } from "@/lib/ops";
import { evaluatePlatformRuntimeReadiness } from "@/lib/platformRuntimeReadiness";
import { findRepoRootSync } from "@/lib/repoRoot";

const sloSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  metricKey: z.enum(["studio_failed_jobs_24h_rate", "live_channel_healthy_ratio", "ops_stale_in_progress_tasks"]),
  operator: z.enum([">=", "<="]),
  target: z.number(),
  unit: z.enum(["ratio", "count"]),
  severity: z.enum(["warning", "critical"])
});

const budgetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["RENDER", "STORAGE", "OPS_AUTOMATION"]),
  monthlyLimitCents: z.number().int().positive(),
  warnAtRatio: z.number().min(0).max(1),
  errorAtRatio: z.number().min(0).max(1)
});

const deploymentProfileSchema = z.object({
  env: z.enum(["dev", "stage", "prod"]),
  requiredEnv: z.array(z.string().min(1))
});

const complianceControlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  evidencePath: z.string().min(1),
  required: z.boolean()
});

const launchGateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  checkKey: z.enum([
    "slo_breaches",
    "budget_breaches",
    "compliance_required_failures",
    "prod_deployment_missing_env",
    "runtime_readiness_failures",
    "critical_dependency_failures"
  ]),
  maxAllowed: z.number().int().min(0),
  severity: z.enum(["warning", "critical"])
});

const serviceDependencySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["database", "cache", "storage", "queue", "realtime", "internal_api"]),
  criticality: z.enum(["critical", "high", "medium", "low"]),
  blastRadius: z.string().min(1),
  check: z.enum(["db_query", "env_present", "always_healthy"]),
  envKeys: z.array(z.string().min(1)).default([])
});

export type SloConfig = z.infer<typeof sloSchema>;
export type BudgetConfig = z.infer<typeof budgetSchema>;
export type DeploymentProfile = z.infer<typeof deploymentProfileSchema>;
export type ComplianceControl = z.infer<typeof complianceControlSchema>;
export type LaunchGate = z.infer<typeof launchGateSchema>;
export type ServiceDependency = z.infer<typeof serviceDependencySchema>;

type GovernanceConfig = {
  slos: SloConfig[];
  budgets: BudgetConfig[];
  deploymentProfiles: DeploymentProfile[];
  complianceControls: ComplianceControl[];
  launchGates: LaunchGate[];
  serviceDependencies: ServiceDependency[];
};

const defaultConfig: GovernanceConfig = {
  slos: [
    {
      id: "studio-failure-rate-24h",
      name: "Studio Failure Rate (24h)",
      description: "Protects media pipeline reliability under steady production load.",
      metricKey: "studio_failed_jobs_24h_rate",
      operator: "<=",
      target: 0.08,
      unit: "ratio",
      severity: "critical"
    },
    {
      id: "live-channel-health",
      name: "Live Channel Healthy Ratio",
      description: "Ensures watch live channels stay healthy for viewers.",
      metricKey: "live_channel_healthy_ratio",
      operator: ">=",
      target: 0.95,
      unit: "ratio",
      severity: "critical"
    },
    {
      id: "ops-stale-tasks",
      name: "Ops Stale In-Progress Tasks",
      description: "Keeps incident/task response loops from silently stalling.",
      metricKey: "ops_stale_in_progress_tasks",
      operator: "<=",
      target: 2,
      unit: "count",
      severity: "warning"
    }
  ],
  budgets: [
    {
      id: "monthly-render",
      name: "Monthly Render Budget",
      category: "RENDER",
      monthlyLimitCents: 100_000,
      warnAtRatio: 0.8,
      errorAtRatio: 1
    },
    {
      id: "monthly-storage",
      name: "Monthly Storage Budget",
      category: "STORAGE",
      monthlyLimitCents: 30_000,
      warnAtRatio: 0.8,
      errorAtRatio: 1
    },
    {
      id: "monthly-ops-automation",
      name: "Monthly Ops Automation Budget",
      category: "OPS_AUTOMATION",
      monthlyLimitCents: 20_000,
      warnAtRatio: 0.85,
      errorAtRatio: 1
    }
  ],
  deploymentProfiles: [
    {
      env: "dev",
      requiredEnv: ["DATABASE_URL", "REDIS_URL", "NEXTAUTH_SECRET"]
    },
    {
      env: "stage",
      requiredEnv: [
        "DATABASE_URL",
        "REDIS_URL",
        "NEXTAUTH_URL",
        "NEXTAUTH_SECRET",
        "S3_ENDPOINT",
        "S3_BUCKET",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET"
      ]
    },
    {
      env: "prod",
      requiredEnv: [
        "DATABASE_URL",
        "REDIS_URL",
        "NEXTAUTH_URL",
        "NEXTAUTH_SECRET",
        "S3_ENDPOINT",
        "S3_BUCKET",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET"
      ]
    }
  ],
  complianceControls: [
    {
      id: "privacy-retention-policy",
      name: "Privacy and Retention Policy",
      owner: "Legal/Compliance",
      evidencePath: "docs/compliance/privacy-retention.md",
      required: true
    },
    {
      id: "content-policy-enforcement",
      name: "Content Policy and Enforcement Runbook",
      owner: "Trust & Safety",
      evidencePath: "docs/compliance/content-policy.md",
      required: true
    },
    {
      id: "incident-response-runbook",
      name: "Incident Response Runbook",
      owner: "Ops/SRE",
      evidencePath: "docs/ops_brain/runbooks/incident-response.md",
      required: true
    },
    {
      id: "user-data-request-playbook",
      name: "User Data Access/Deletion Playbook",
      owner: "Support + Legal",
      evidencePath: "docs/compliance/data-request-playbook.md",
      required: true
    }
  ],
  launchGates: [
    {
      id: "gate-slo",
      name: "SLO Breach Gate",
      description: "Launch is blocked when any critical SLO is breached.",
      checkKey: "slo_breaches",
      maxAllowed: 0,
      severity: "critical"
    },
    {
      id: "gate-budget",
      name: "Budget Breach Gate",
      description: "Launch is blocked when spend guardrails are breached.",
      checkKey: "budget_breaches",
      maxAllowed: 0,
      severity: "critical"
    },
    {
      id: "gate-compliance",
      name: "Compliance Evidence Gate",
      description: "Required compliance controls must have evidence files.",
      checkKey: "compliance_required_failures",
      maxAllowed: 0,
      severity: "critical"
    },
    {
      id: "gate-prod-env",
      name: "Production Env Gate",
      description: "Production promotion requires all required environment variables.",
      checkKey: "prod_deployment_missing_env",
      maxAllowed: 0,
      severity: "critical"
    },
    {
      id: "gate-runtime-readiness",
      name: "Platform Runtime Truth Gate",
      description: "Launch is blocked when runtime readiness assets or APIs are missing.",
      checkKey: "runtime_readiness_failures",
      maxAllowed: 0,
      severity: "critical"
    },
    {
      id: "gate-critical-dependencies",
      name: "Critical Dependency Gate",
      description: "Launch is blocked when critical or high-blast-radius dependencies are degraded.",
      checkKey: "critical_dependency_failures",
      maxAllowed: 0,
      severity: "critical"
    }
  ],
  serviceDependencies: [
    {
      id: "postgres-primary",
      name: "Primary Postgres",
      kind: "database",
      criticality: "critical",
      blastRadius: "watch, party, studio, feed, admin",
      check: "db_query",
      envKeys: ["DATABASE_URL"]
    },
    {
      id: "redis-cache",
      name: "Redis Cache + Queue Broker",
      kind: "cache",
      criticality: "critical",
      blastRadius: "queue processing, sessions, realtime fanout",
      check: "env_present",
      envKeys: ["REDIS_URL"]
    },
    {
      id: "s3-storage",
      name: "Object Storage",
      kind: "storage",
      criticality: "high",
      blastRadius: "studio upload, render outputs, thumbnails",
      check: "env_present",
      envKeys: ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"]
    },
    {
      id: "livekit-realtime",
      name: "LiveKit Realtime",
      kind: "realtime",
      criticality: "high",
      blastRadius: "party voice and low-latency collaboration",
      check: "env_present",
      envKeys: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
    },
    {
      id: "agent-worker-queue",
      name: "Agent/Worker Queue",
      kind: "queue",
      criticality: "high",
      blastRadius: "studio async jobs and automation loops",
      check: "env_present",
      envKeys: ["REDIS_URL"]
    }
  ]
};

type PrismaLike = {
  $queryRaw: <T>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

function governanceRoot() {
  return path.join(findRepoRootSync(), "ops", "governance");
}

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readArrayFile<T>(
  filename: string,
  schema: z.ZodType<T>,
  fallback: T[]
): Promise<T[]> {
  const fullPath = path.join(governanceRoot(), filename);
  if (!(await exists(fullPath))) return fallback;
  const raw = await fs.readFile(fullPath, "utf-8");
  const parsed = JSON.parse(raw);
  const result = z.array(schema).safeParse(parsed);
  if (!result.success) {
    return fallback;
  }
  return result.data as T[];
}

export async function loadGovernanceConfig(): Promise<GovernanceConfig> {
  const [slos, budgets, deploymentProfiles, complianceControls, launchGates, serviceDependencies] = await Promise.all([
    readArrayFile("slos.json", sloSchema, defaultConfig.slos),
    readArrayFile("budgets.json", budgetSchema, defaultConfig.budgets),
    readArrayFile("deployment.json", deploymentProfileSchema, defaultConfig.deploymentProfiles),
    readArrayFile("compliance-controls.json", complianceControlSchema, defaultConfig.complianceControls),
    readArrayFile("launch-gates.json", launchGateSchema, defaultConfig.launchGates),
    readArrayFile("service-dependencies.json", serviceDependencySchema, defaultConfig.serviceDependencies)
  ]);

  return {
    slos,
    budgets,
    deploymentProfiles,
    complianceControls,
    launchGates,
    serviceDependencies: serviceDependencies.map((dependency) => ({
      ...dependency,
      envKeys: dependency.envKeys ?? []
    }))
  };
}

function evaluateSlo(actual: number, operator: ">=" | "<=", target: number) {
  if (operator === ">=") return actual >= target;
  return actual <= target;
}

function startOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function estimateRenderCostCents(jobType: string) {
  const costByType: Record<string, number> = {
    SHORT_SCRIPT: 6,
    SHORT_SCENES: 18,
    SHORT_RENDER: 45,
    MEME_CAPTIONS: 2,
    MEME_RENDER: 8,
    VIDEO_CLIP_EXTRACT: 15,
    VIDEO_TRANSCODE: 35,
    THUMBNAIL_GENERATE: 3
  };
  return costByType[jobType] ?? 0;
}

export function computeStorageCostCents(sizeBytes: number) {
  const gb = sizeBytes / (1024 * 1024 * 1024);
  return gb * 2.3;
}

function parseRatio(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export async function buildObservabilitySnapshot(prisma: PrismaLike) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [jobRows, liveRows] = await Promise.all([
    prisma.$queryRaw<{ total: bigint; failed: bigint }[]>`
      SELECT COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE "status" = 'FAILED')::bigint AS failed
      FROM "AgentJob"
      WHERE "createdAt" >= ${since24h}
    `,
    prisma.$queryRaw<{ active: bigint; healthy: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE "isActive" = TRUE)::bigint AS active,
             COUNT(*) FILTER (
               WHERE "isActive" = TRUE
                 AND "lastHealthyAt" IS NOT NULL
                 AND "lastHealthyAt" >= NOW() - INTERVAL '15 minutes'
             )::bigint AS healthy
      FROM "LiveChannel"
    `
  ]);

  const totalJobs = Number(jobRows[0]?.total ?? 0n);
  const failedJobs = Number(jobRows[0]?.failed ?? 0n);
  const activeChannels = Number(liveRows[0]?.active ?? 0n);
  const healthyChannels = Number(liveRows[0]?.healthy ?? 0n);

  const staleInProgress = await readStaleInProgressTaskCount();

  return {
    studio_failed_jobs_24h_rate: totalJobs > 0 ? failedJobs / totalJobs : 0,
    live_channel_healthy_ratio: activeChannels > 0 ? healthyChannels / activeChannels : 1,
    ops_stale_in_progress_tasks: staleInProgress,
    dimensions: {
      totalJobs,
      failedJobs,
      activeChannels,
      healthyChannels,
      staleInProgress
    }
  };
}

export async function buildSloStatus(prisma: PrismaLike) {
  const config = await loadGovernanceConfig();
  const snapshot = await buildObservabilitySnapshot(prisma);

  const slos = config.slos.map((slo) => {
    const actual = parseRatio(snapshot[slo.metricKey]);
    const pass = evaluateSlo(actual, slo.operator, slo.target);
    return {
      ...slo,
      actual,
      pass
    };
  });

  return {
    slos,
    breaches: slos.filter((item) => !item.pass),
    generatedAt: new Date().toISOString(),
    dimensions: snapshot.dimensions
  };
}

export async function buildBudgetStatus(prisma: PrismaLike) {
  const config = await loadGovernanceConfig();
  const monthStart = startOfMonth();

  const [jobCounts, storageRows, eventRows] = await Promise.all([
    prisma.$queryRaw<{ type: string; count: bigint }[]>`
      SELECT "type", COUNT(*)::bigint AS count
      FROM "AgentJob"
      WHERE "createdAt" >= ${monthStart}
      GROUP BY "type"
    `,
    prisma.$queryRaw<{ bytes: bigint }[]>`
      SELECT COALESCE(SUM("sizeBytes"), 0)::bigint AS bytes
      FROM "StudioAsset"
      WHERE "createdAt" >= ${monthStart}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "PlatformEvent"
      WHERE "createdAt" >= ${monthStart}
    `
  ]);

  const renderCents = jobCounts.reduce((sum, row) => sum + estimateRenderCostCents(row.type) * Number(row.count), 0);
  const storageBytes = Number(storageRows[0]?.bytes ?? 0n);
  const storageCents = computeStorageCostCents(storageBytes);
  const opsEventCount = Number(eventRows[0]?.count ?? 0n);
  const opsAutomationCents = opsEventCount * 0.01;

  const actualByCategory: Record<BudgetConfig["category"], number> = {
    RENDER: renderCents,
    STORAGE: storageCents,
    OPS_AUTOMATION: opsAutomationCents
  };

  const budgets = config.budgets.map((budget) => {
    const actualCents = actualByCategory[budget.category] ?? 0;
    const utilization = actualCents / budget.monthlyLimitCents;
    const state = utilization >= budget.errorAtRatio ? "breach" : utilization >= budget.warnAtRatio ? "warning" : "ok";
    return {
      ...budget,
      actualCents: Math.round(actualCents),
      utilization,
      state
    };
  });

  return {
    monthStart: monthStart.toISOString(),
    budgets,
    breaches: budgets.filter((item) => item.state === "breach"),
    generatedAt: new Date().toISOString(),
    dimensions: {
      renderCents: Math.round(renderCents),
      storageCents: Math.round(storageCents),
      opsAutomationCents: Math.round(opsAutomationCents),
      storageBytes,
      opsEventCount
    }
  };
}

export async function buildDeploymentStatus() {
  const config = await loadGovernanceConfig();
  const profiles = config.deploymentProfiles.map((profile) => {
    const missingEnv = profile.requiredEnv.filter((name) => !process.env[name]?.trim());
    return {
      ...profile,
      missingEnv,
      ready: missingEnv.length === 0
    };
  });

  return {
    profiles,
    generatedAt: new Date().toISOString()
  };
}

export async function buildComplianceStatus(prisma: PrismaLike) {
  const config = await loadGovernanceConfig();
  const repoRoot = findRepoRootSync();
  const [oldestAuditRows, unresolvedRows] = await Promise.all([
    prisma.$queryRaw<{ oldest: Date | null; total: bigint }[]>`
      SELECT MIN("createdAt") AS oldest, COUNT(*)::bigint AS total
      FROM "AdminAudit"
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "FeedReport"
      WHERE "resolvedAt" IS NULL
        AND "createdAt" <= NOW() - INTERVAL '14 days'
    `
  ]);

  const controls = await Promise.all(
    config.complianceControls.map(async (control) => {
      const fullPath = path.join(repoRoot, control.evidencePath);
      const evidenceExists = await exists(fullPath);
      return {
        ...control,
        evidenceExists,
        pass: control.required ? evidenceExists : true
      };
    })
  );

  return {
    controls,
    requiredFailures: controls.filter((item) => item.required && !item.pass),
    unresolvedReportsOlderThan14d: Number(unresolvedRows[0]?.count ?? 0n),
    oldestAuditAt: oldestAuditRows[0]?.oldest ? new Date(oldestAuditRows[0].oldest).toISOString() : null,
    totalAudits: Number(oldestAuditRows[0]?.total ?? 0n),
    generatedAt: new Date().toISOString()
  };
}

export async function buildLaunchReadiness(prisma: PrismaLike) {
  const [slo, budget, compliance, deployment, config, dependencyHealth] = await Promise.all([
    buildSloStatus(prisma),
    buildBudgetStatus(prisma),
    buildComplianceStatus(prisma),
    buildDeploymentStatus(),
    loadGovernanceConfig(),
    buildServiceDependencyHealth(prisma)
  ]);

  const prodProfile = deployment.profiles.find((profile) => profile.env === "prod");
  const runtimeReadiness = evaluatePlatformRuntimeReadiness();
  const runtimeReadinessFailures =
    runtimeReadiness.missingDocs.length + runtimeReadiness.missingApis.length + runtimeReadiness.missingRuntimeFiles.length;
  const criticalDependencyFailures = dependencyHealth.dependencies.filter(
    (dependency) =>
      (dependency.criticality === "critical" || dependency.criticality === "high") && dependency.status !== "healthy"
  ).length;

  const checks = {
    slo_breaches: slo.breaches.length,
    budget_breaches: budget.breaches.length,
    compliance_required_failures: compliance.requiredFailures.length,
    prod_deployment_missing_env: prodProfile?.missingEnv.length ?? 0,
    runtime_readiness_failures: runtimeReadinessFailures,
    critical_dependency_failures: criticalDependencyFailures
  };

  const gates = config.launchGates.map((gate) => {
    const observed = checks[gate.checkKey];
    const pass = observed <= gate.maxAllowed;
    return {
      ...gate,
      observed,
      pass
    };
  });

  return {
    gates,
    blockers: gates.filter((gate) => !gate.pass && gate.severity === "critical"),
    warnings: gates.filter((gate) => !gate.pass && gate.severity === "warning"),
    generatedAt: new Date().toISOString(),
    checks,
    runtimeReadiness,
    dependencyHealth
  };
}

type DependencyHealthState = "healthy" | "degraded" | "unhealthy";

async function evaluateDependency(
  prisma: PrismaLike,
  dependency: ServiceDependency
): Promise<{
  id: string;
  name: string;
  kind: ServiceDependency["kind"];
  criticality: ServiceDependency["criticality"];
  blastRadius: string;
  status: DependencyHealthState;
  missingEnv: string[];
}> {
  const missingEnv = dependency.envKeys.filter((name) => !process.env[name]?.trim());

  if (dependency.check === "always_healthy") {
    return { ...dependency, status: "healthy", missingEnv };
  }

  if (dependency.check === "env_present") {
    const status: DependencyHealthState = missingEnv.length > 0 ? "degraded" : "healthy";
    return { ...dependency, status, missingEnv };
  }

  if (dependency.check === "db_query") {
    if (missingEnv.length > 0) {
      return { ...dependency, status: "unhealthy", missingEnv };
    }
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ...dependency, status: "healthy", missingEnv };
    } catch {
      return { ...dependency, status: "unhealthy", missingEnv };
    }
  }

  return { ...dependency, status: "degraded", missingEnv };
}

export async function buildServiceDependencyHealth(prisma: PrismaLike) {
  const config = await loadGovernanceConfig();
  const dependencies = await Promise.all(
    config.serviceDependencies.map((dependency) => evaluateDependency(prisma, dependency))
  );

  const summary = {
    critical: dependencies.filter((item) => item.criticality === "critical").length,
    high: dependencies.filter((item) => item.criticality === "high").length,
    medium: dependencies.filter((item) => item.criticality === "medium").length,
    low: dependencies.filter((item) => item.criticality === "low").length,
    unhealthy: dependencies.filter((item) => item.status === "unhealthy").length,
    degraded: dependencies.filter((item) => item.status === "degraded").length
  };

  return {
    dependencies,
    summary,
    generatedAt: new Date().toISOString()
  };
}

async function readStaleInProgressTaskCount() {
  const opsRoot = path.join(findRepoRootSync(), "ops");
  if (!(await exists(path.join(opsRoot, "briefing.md")))) {
    return 0;
  }
  const tasks = await readTasks(opsRoot);
  const now = Date.now();
  return tasks.filter((task) => task.status === "in_progress" && now - task.createdAtTs > 6 * 60 * 60 * 1000).length;
}

export function evaluateLaunchGate(observed: number, maxAllowed: number) {
  return observed <= maxAllowed;
}
