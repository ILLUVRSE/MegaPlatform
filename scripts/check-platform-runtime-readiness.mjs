#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultManifest = {
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

function readJson(target, fallback) {
  if (!existsSync(target)) return fallback;
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch {
    return fallback;
  }
}

function walk(dir, out = []) {
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

function normalizeRoute(apiRoot, filePath) {
  const rel = path.relative(apiRoot, filePath).replace(/\\/g, "/");
  const withoutSuffix = rel.replace(/\/route\.ts$/, "");
  return `/api/${withoutSuffix}`.replace(/\/+/g, "/");
}

function resolveMethods(filePath) {
  const source = readFileSync(filePath, "utf8");
  const matches = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)];
  return [...new Set(matches.map((match) => match[1]))].sort();
}

function generateApiRegistrySnapshot() {
  const apiRoot = path.join(root, "apps", "web", "app", "api");
  if (!existsSync(apiRoot)) {
    return { scope: "apps/web/app/api", routeCount: 0, routes: [] };
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

const manifestPath = path.join(root, "ops", "governance", "platform-runtime-truth.json");
const manifest = readJson(manifestPath, defaultManifest);
const apiRegistryPath = path.join(root, "docs", "api-registry.web.json");
const registry = readJson(apiRegistryPath, { routes: [] });
const generatedRegistry = generateApiRegistrySnapshot();
const registeredRoutes = new Set((registry.routes ?? []).map((route) => route.route));
const generatedRoutes = new Set((generatedRegistry.routes ?? []).map((route) => route.route));
const slos = readJson(path.join(root, "ops", "governance", "slos.json"), []);
const launchGates = readJson(path.join(root, "ops", "governance", "launch-gates.json"), []);

const readiness = {
  missingDocs: manifest.requiredDocs.filter((file) => !existsSync(path.join(root, file))),
  missingApis: manifest.requiredApis.filter((route) => !registeredRoutes.has(route)),
  missingRuntimeFiles: manifest.requiredRuntimeFiles.filter((file) => !existsSync(path.join(root, file))),
  missingGovernanceManifests: manifest.requiredGovernanceManifests.filter((file) => !existsSync(path.join(root, file))),
  missingSloIds: manifest.requiredSloIds.filter((id) => !slos.some((item) => item?.id === id)),
  missingLaunchGateIds: manifest.requiredLaunchGateIds.filter((id) => !launchGates.some((item) => item?.id === id)),
  unregisteredRequiredApis: manifest.requiredApis.filter((route) => !generatedRoutes.has(route)),
  apiRegistryDrift: JSON.stringify(registry) !== JSON.stringify(generatedRegistry)
};
readiness.ok =
  readiness.missingDocs.length === 0 &&
  readiness.missingApis.length === 0 &&
  readiness.missingRuntimeFiles.length === 0 &&
  readiness.missingGovernanceManifests.length === 0 &&
  readiness.missingSloIds.length === 0 &&
  readiness.missingLaunchGateIds.length === 0 &&
  readiness.unregisteredRequiredApis.length === 0 &&
  !readiness.apiRegistryDrift;

if (!readiness.ok) {
  process.stdout.write("[platform-runtime-readiness] FAIL\n");
  if (readiness.missingDocs.length > 0) {
    process.stdout.write(`- missing docs: ${readiness.missingDocs.join(", ")}\n`);
  }
  if (readiness.missingApis.length > 0) {
    process.stdout.write(`- missing apis: ${readiness.missingApis.join(", ")}\n`);
  }
  if (readiness.missingRuntimeFiles.length > 0) {
    process.stdout.write(`- missing runtime files: ${readiness.missingRuntimeFiles.join(", ")}\n`);
  }
  if (readiness.missingGovernanceManifests.length > 0) {
    process.stdout.write(`- missing governance manifests: ${readiness.missingGovernanceManifests.join(", ")}\n`);
  }
  if (readiness.missingSloIds.length > 0) {
    process.stdout.write(`- missing slo ids: ${readiness.missingSloIds.join(", ")}\n`);
  }
  if (readiness.missingLaunchGateIds.length > 0) {
    process.stdout.write(`- missing launch gate ids: ${readiness.missingLaunchGateIds.join(", ")}\n`);
  }
  if (readiness.unregisteredRequiredApis.length > 0) {
    process.stdout.write(`- missing route sources: ${readiness.unregisteredRequiredApis.join(", ")}\n`);
  }
  if (readiness.apiRegistryDrift) {
    process.stdout.write("- api registry drift: docs/api-registry.web.json is out of date\n");
  }
  process.exit(1);
}

process.stdout.write("[platform-runtime-readiness] PASS\n");
