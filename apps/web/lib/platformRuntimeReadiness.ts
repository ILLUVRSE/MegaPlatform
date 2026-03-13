import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { findRepoRootSync } from "@/lib/repoRoot";

type PlatformRuntimeTruthManifest = {
  phases: number[];
  requiredDocs: string[];
  requiredRuntimeFiles: string[];
  requiredApis: string[];
  requiredGovernanceManifests: string[];
  requiredSloIds: string[];
  requiredLaunchGateIds: string[];
};

export type PlatformRuntimeReadiness = ReturnType<typeof evaluatePlatformRuntimeReadiness>;

const defaultManifest: PlatformRuntimeTruthManifest = {
  phases: [301, 302, 303, 304, 305, 306, 307, 308, 309, 310],
  requiredDocs: [
    "docs/platform-session-graph.md",
    "docs/universal-identity-presence-layer.md",
    "docs/cross-app-inbox-task-queue.md",
    "docs/unified-search-discovery-spine.md",
    "docs/megaplatform-command-palette.md",
    "docs/social-graph-squad-runtime.md",
    "docs/economy-spine-entitlement-ledger-v2.md",
    "docs/cross-surface-recommendation-runtime.md",
    "docs/home-surface-orchestrated-control-deck.md",
    "docs/platform-runtime-truth-readiness-gate.md"
  ],
  requiredRuntimeFiles: [
    "apps/web/lib/platformSessionGraph.ts",
    "apps/web/lib/platformInbox.ts",
    "apps/web/lib/platformSearch.ts",
    "apps/web/lib/platformCommands.ts",
    "apps/web/lib/platformSquads.ts",
    "apps/web/lib/platformEconomy.ts",
    "apps/web/lib/platformRecommendations.ts",
    "apps/web/app/home/components/PlatformControlDeck.tsx",
    "scripts/check-platform-runtime-readiness.mjs",
    "apps/web/app/api/admin/platform/runtime-readiness/route.ts"
  ],
  requiredApis: [
    "/api/platform/session",
    "/api/platform/presence",
    "/api/inbox",
    "/api/platform/search",
    "/api/platform/commands",
    "/api/social/squads",
    "/api/economy/summary",
    "/api/admin/platform/runtime-readiness"
  ],
  requiredGovernanceManifests: [
    "ops/governance/platform-runtime-truth.json",
    "ops/governance/slos.json",
    "ops/governance/launch-gates.json",
    "ops/governance/service-dependencies.json",
    "ops/governance/deployment.json",
    "ops/governance/compliance-controls.json",
    "ops/governance/alerts/slo-breach-alerts.json"
  ],
  requiredSloIds: ["studio-failure-rate-24h", "live-channel-health", "ops-stale-tasks"],
  requiredLaunchGateIds: ["gate-slo", "gate-runtime-readiness", "gate-critical-dependencies"]
};

export const PLATFORM_RUNTIME_TRUTH = defaultManifest;

function readJsonFile<T>(target: string, fallback: T): T {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse(readFileSync(target, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function loadManifest(root: string): PlatformRuntimeTruthManifest {
  const manifestPath = path.join(root, "ops", "governance", "platform-runtime-truth.json");
  return readJsonFile<PlatformRuntimeTruthManifest>(manifestPath, defaultManifest);
}

function walk(dir: string, out: string[] = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (st.isFile() && entry === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

function normalizeRoute(apiRoot: string, filePath: string) {
  const rel = path.relative(apiRoot, filePath).replace(/\\/g, "/");
  const withoutSuffix = rel.replace(/\/route\.ts$/, "");
  return `/api/${withoutSuffix}`.replace(/\/+/g, "/");
}

function resolveMethods(filePath: string) {
  const source = readFileSync(filePath, "utf-8");
  const matches = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)];
  return [...new Set(matches.map((match) => match[1]))].sort();
}

function generateApiRegistrySnapshot(root: string) {
  const apiRoot = path.join(root, "apps", "web", "app", "api");
  if (!existsSync(apiRoot)) {
    return { scope: "apps/web/app/api", routeCount: 0, routes: [] as Array<{ route: string; methods: string[]; source: string }> };
  }

  const routeFiles = walk(apiRoot).sort();
  const routes = routeFiles.map((filePath) => ({
    route: normalizeRoute(apiRoot, filePath),
    methods: resolveMethods(filePath),
    source: path.relative(root, filePath).replace(/\\/g, "/")
  }));

  return {
    scope: "apps/web/app/api",
    routeCount: routes.length,
    routes
  };
}

export function evaluatePlatformRuntimeReadiness(root = findRepoRootSync()) {
  const manifest = loadManifest(root);
  const apiRegistryPath = path.join(root, "docs", "api-registry.web.json");
  const registry = readJsonFile<{ scope?: string; routeCount?: number; routes?: Array<{ route: string; methods?: string[]; source?: string }> }>(
    apiRegistryPath,
    { routes: [] }
  );
  const generatedRegistry = generateApiRegistrySnapshot(root);

  const missingDocs = manifest.requiredDocs.filter((file) => !existsSync(path.join(root, file)));
  const registeredRoutes = new Set((registry.routes ?? []).map((route) => route.route));
  const generatedRoutes = new Set(generatedRegistry.routes.map((route) => route.route));
  const missingApis = manifest.requiredApis.filter((route) => !registeredRoutes.has(route));
  const unregisteredRequiredApis = manifest.requiredApis.filter((route) => !generatedRoutes.has(route));
  const missingRuntimeFiles = manifest.requiredRuntimeFiles.filter((file) => !existsSync(path.join(root, file)));
  const missingGovernanceManifests = manifest.requiredGovernanceManifests.filter((file) => !existsSync(path.join(root, file)));

  const slos = readJsonFile<Array<{ id?: string }>>(path.join(root, "ops", "governance", "slos.json"), []);
  const launchGates = readJsonFile<Array<{ id?: string }>>(path.join(root, "ops", "governance", "launch-gates.json"), []);
  const sloIds = new Set(slos.map((item) => item.id).filter(Boolean));
  const launchGateIds = new Set(launchGates.map((item) => item.id).filter(Boolean));
  const missingSloIds = manifest.requiredSloIds.filter((id) => !sloIds.has(id));
  const missingLaunchGateIds = manifest.requiredLaunchGateIds.filter((id) => !launchGateIds.has(id));

  const registryDrift =
    JSON.stringify(registry) !== JSON.stringify(generatedRegistry);

  const blockers = [
    ...missingDocs.map((item) => ({ category: "docs", item })),
    ...missingRuntimeFiles.map((item) => ({ category: "runtime_files", item })),
    ...missingApis.map((item) => ({ category: "api_registry", item })),
    ...unregisteredRequiredApis.map((item) => ({ category: "api_routes", item })),
    ...missingGovernanceManifests.map((item) => ({ category: "governance_manifests", item })),
    ...missingSloIds.map((item) => ({ category: "slos", item })),
    ...missingLaunchGateIds.map((item) => ({ category: "launch_gates", item })),
    ...(registryDrift ? [{ category: "api_registry", item: "docs/api-registry.web.json out of date" }] : [])
  ];

  return {
    ok: blockers.length === 0,
    missingDocs,
    missingApis,
    missingRuntimeFiles,
    missingGovernanceManifests,
    missingSloIds,
    missingLaunchGateIds,
    unregisteredRequiredApis,
    apiRegistry: {
      path: "docs/api-registry.web.json",
      routeCount: registry.routeCount ?? (registry.routes ?? []).length,
      generatedRouteCount: generatedRegistry.routeCount,
      driftDetected: registryDrift
    },
    blockers,
    summary: {
      blockerCount: blockers.length,
      topBlockers: blockers.slice(0, 3)
    },
    checkedAt: new Date().toISOString(),
    phases: manifest.phases
  };
}
