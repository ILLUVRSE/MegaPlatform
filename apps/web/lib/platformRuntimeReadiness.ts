import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { findRepoRootSync } from "@/lib/repoRoot";

export const PLATFORM_RUNTIME_TRUTH = {
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
  requiredApis: [
    "/api/platform/session",
    "/api/platform/presence",
    "/api/inbox",
    "/api/platform/search",
    "/api/platform/commands",
    "/api/social/squads",
    "/api/economy/summary",
    "/api/admin/platform/runtime-readiness"
  ]
} as const;

export function evaluatePlatformRuntimeReadiness(root = findRepoRootSync()) {
  const apiRegistryPath = path.join(root, "docs", "api-registry.web.json");
  const registry = existsSync(apiRegistryPath)
    ? (JSON.parse(readFileSync(apiRegistryPath, "utf8")) as { routes?: Array<{ route: string }> })
    : { routes: [] };

  const missingDocs = PLATFORM_RUNTIME_TRUTH.requiredDocs.filter((file) => !existsSync(path.join(root, file)));
  const registeredRoutes = new Set((registry.routes ?? []).map((route) => route.route));
  const missingApis = PLATFORM_RUNTIME_TRUTH.requiredApis.filter((route) => !registeredRoutes.has(route));

  const runtimeFiles = [
    "apps/web/lib/platformSessionGraph.ts",
    "apps/web/lib/platformInbox.ts",
    "apps/web/lib/platformSearch.ts",
    "apps/web/lib/platformCommands.ts",
    "apps/web/lib/platformSquads.ts",
    "apps/web/lib/platformEconomy.ts",
    "apps/web/lib/platformRecommendations.ts",
    "apps/web/app/home/components/PlatformControlDeck.tsx",
    "scripts/check-platform-runtime-readiness.mjs"
  ];
  const missingRuntimeFiles = runtimeFiles.filter((file) => !existsSync(path.join(root, file)));

  return {
    ok: missingDocs.length === 0 && missingApis.length === 0 && missingRuntimeFiles.length === 0,
    missingDocs,
    missingApis,
    missingRuntimeFiles,
    checkedAt: new Date().toISOString(),
    phases: PLATFORM_RUNTIME_TRUTH.phases
  };
}
