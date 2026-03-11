#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const rg = spawnSync(
  "rg",
  [
    "--glob",
    "*.ts",
    "--glob",
    "*.tsx",
    "--glob",
    "!**/node_modules/**",
    "--glob",
    "!**/.next/**",
    "--glob",
    "!**/dist/**",
    "--files",
    "apps",
    "packages"
  ],
  { encoding: "utf-8" }
);

if (rg.status !== 0) {
  console.error("[boundary-check] FAIL unable to enumerate source files");
  process.exit(1);
}

const files = rg.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
let failures = 0;

const disallowedImport = /from\s+["'](?:\.\.\/)+(?:apps\/|packages\/)|from\s+["']apps\//;
const appImportRegex = /from\s+["']@\/app\/([^"']+)["']/g;

function normalizeAppSegment(segment) {
  if (!segment || segment.startsWith("(") || segment.startsWith("[") || segment.startsWith("_")) {
    return null;
  }
  return segment;
}

function getAppDomain(file) {
  if (!file.startsWith("apps/web/app/")) {
    return null;
  }
  const relative = file.slice("apps/web/app/".length);
  const [first] = relative.split("/");
  return normalizeAppSegment(first);
}

for (const file of files) {
  if (file.includes("/tests/")) {
    continue;
  }
  const source = readFileSync(file, "utf-8");
  if (disallowedImport.test(source)) {
    failures += 1;
    console.error(`[boundary-check] FAIL ${file}: contains cross-root relative import into apps/ or packages/`);
  }

  const importerDomain = getAppDomain(file);
  for (const match of source.matchAll(appImportRegex)) {
    const importPath = match[1];
    const [first] = importPath.split("/");
    const targetDomain = normalizeAppSegment(first);

    if (!file.startsWith("apps/web/app/")) {
      failures += 1;
      console.error(`[boundary-check] FAIL ${file}: non-route code must not import from @/app/* (${match[0]})`);
      continue;
    }

    if (!targetDomain || targetDomain === importerDomain) {
      continue;
    }

    failures += 1;
    console.error(
      `[boundary-check] FAIL ${file}: cross-surface app import from ${importerDomain ?? "root"} to ${targetDomain} (${match[0]})`
    );
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`[boundary-check] PASS ${files.length} files scanned`);
