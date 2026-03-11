#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredDocs = [
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
];
const requiredApis = [
  "/api/platform/session",
  "/api/platform/presence",
  "/api/inbox",
  "/api/platform/search",
  "/api/platform/commands",
  "/api/social/squads",
  "/api/economy/summary",
  "/api/admin/platform/runtime-readiness"
];
const requiredRuntimeFiles = [
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

const apiRegistryPath = path.join(root, "docs", "api-registry.web.json");
const registry = existsSync(apiRegistryPath)
  ? JSON.parse(readFileSync(apiRegistryPath, "utf8"))
  : { routes: [] };
const registeredRoutes = new Set((registry.routes ?? []).map((route) => route.route));
const readiness = {
  missingDocs: requiredDocs.filter((file) => !existsSync(path.join(root, file))),
  missingApis: requiredApis.filter((route) => !registeredRoutes.has(route)),
  missingRuntimeFiles: requiredRuntimeFiles.filter((file) => !existsSync(path.join(root, file)))
};
readiness.ok =
  readiness.missingDocs.length === 0 &&
  readiness.missingApis.length === 0 &&
  readiness.missingRuntimeFiles.length === 0;

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
  process.exit(1);
}

process.stdout.write("[platform-runtime-readiness] PASS\n");
