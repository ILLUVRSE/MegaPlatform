#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_ROOT_DIR, "packages", "governance", "boundaries-config.json");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIPPED_DIRS = new Set([".git", ".next", "coverage", "dist", "node_modules"]);
const DISALLOWED_IMPORT = /from\s+["'](?:\.\.\/)+(?:apps\/|packages\/)|from\s+["']apps\//;
const APP_IMPORT_REGEX = /from\s+["']@\/app\/([^"']+)["']/g;
const MODULE_SPECIFIER_REGEX =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function normalizeToPosix(value) {
  return value.split(path.sep).join("/");
}

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

function parseArgs(argv) {
  const options = {
    rootDir: DEFAULT_ROOT_DIR,
    configPath: DEFAULT_CONFIG_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root-dir") {
      options.rootDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--config") {
      options.configPath = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

function walkSourceFiles(rootDir, currentDir, acc) {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIPPED_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(rootDir, fullPath, acc);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }
    acc.push(normalizeToPosix(path.relative(rootDir, fullPath)));
  }
}

function listSourceFiles(rootDir, sourceRoots) {
  const files = [];
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(rootDir, sourceRoot);
    try {
      if (!statSync(absoluteRoot).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    walkSourceFiles(rootDir, absoluteRoot, files);
  }
  return files.sort();
}

export function loadBoundariesConfig(configPath = DEFAULT_CONFIG_PATH) {
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function shouldSkipFile(file, includeTests) {
  return !includeTests && file.includes("/tests/");
}

function collectModuleSpecifiers(source) {
  return Array.from(source.matchAll(MODULE_SPECIFIER_REGEX), (match) => match[1] ?? match[2]).filter(Boolean);
}

function resolveImportTarget(rootDir, importerFile, specifier) {
  if (specifier.startsWith("@/")) {
    return `apps/web/${specifier.slice(2)}`;
  }

  if (specifier.startsWith("apps/") || specifier.startsWith("packages/")) {
    return specifier;
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const importerDir = path.dirname(importerFile);
  const resolved = normalizeToPosix(path.normalize(path.join(importerDir, specifier)));
  if (resolved.startsWith("../")) {
    return null;
  }

  const absoluteResolved = path.resolve(rootDir, resolved);
  const relativeResolved = normalizeToPosix(path.relative(rootDir, absoluteResolved));
  if (relativeResolved.startsWith("../")) {
    return null;
  }
  return relativeResolved;
}

function fileMatchesGroup(file, group) {
  const prefixes = Array.isArray(group.prefixes) ? group.prefixes : [];
  const excludePrefixes = Array.isArray(group.excludePrefixes) ? group.excludePrefixes : [];
  const matchesPrefix = prefixes.some((prefix) => file.startsWith(prefix));
  if (!matchesPrefix) {
    return false;
  }
  return !excludePrefixes.some((prefix) => file.startsWith(prefix));
}

function getGroupsForFile(file, groups) {
  return groups.filter((group) => fileMatchesGroup(file, group)).map((group) => group.name);
}

function formatRuleFailure(rule, importerFile, targetFile) {
  if (rule.message) {
    return `[boundary-check] FAIL ${importerFile}: ${rule.message} (${targetFile})`;
  }
  return `[boundary-check] FAIL ${importerFile}: disallowed import into ${rule.to} (${targetFile})`;
}

export function runBoundaryCheck({
  rootDir = DEFAULT_ROOT_DIR,
  config = loadBoundariesConfig(),
  files,
  includeTests = false
} = {}) {
  const sourceRoots = Array.isArray(config.sourceRoots) ? config.sourceRoots : ["apps", "packages"];
  const boundaryFiles = files ?? listSourceFiles(rootDir, sourceRoots);
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const failures = [];

  for (const file of boundaryFiles) {
    if (shouldSkipFile(file, includeTests)) {
      continue;
    }

    const absoluteFile = path.join(rootDir, file);
    const source = readFileSync(absoluteFile, "utf-8");

    if (DISALLOWED_IMPORT.test(source)) {
      failures.push(
        `[boundary-check] FAIL ${file}: contains cross-root relative import into apps/ or packages/`
      );
    }

    const importerDomain = getAppDomain(file);
    for (const match of source.matchAll(APP_IMPORT_REGEX)) {
      const importPath = match[1];
      const [first] = importPath.split("/");
      const targetDomain = normalizeAppSegment(first);

      if (!file.startsWith("apps/web/app/")) {
        failures.push(`[boundary-check] FAIL ${file}: non-route code must not import from @/app/* (${match[0]})`);
        continue;
      }

      if (!targetDomain || targetDomain === importerDomain) {
        continue;
      }

      failures.push(
        `[boundary-check] FAIL ${file}: cross-surface app import from ${importerDomain ?? "root"} to ${targetDomain} (${match[0]})`
      );
    }

    const importerGroups = getGroupsForFile(file, groups);
    if (importerGroups.length === 0) {
      continue;
    }

    const moduleSpecifiers = collectModuleSpecifiers(source);
    for (const specifier of moduleSpecifiers) {
      const targetFile = resolveImportTarget(rootDir, file, specifier);
      if (!targetFile) {
        continue;
      }

      const targetGroups = getGroupsForFile(targetFile, groups);
      if (targetGroups.length === 0) {
        continue;
      }

      for (const rule of rules) {
        if (!importerGroups.includes(rule.from) || !targetGroups.includes(rule.to)) {
          continue;
        }
        failures.push(formatRuleFailure(rule, file, targetFile));
      }
    }
  }

  return {
    ok: failures.length === 0,
    filesScanned: boundaryFiles.filter((file) => !shouldSkipFile(file, includeTests)).length,
    failures
  };
}

function main() {
  const { rootDir, configPath } = parseArgs(process.argv.slice(2));
  const result = runBoundaryCheck({
    rootDir,
    config: loadBoundariesConfig(configPath)
  });

  if (!result.ok) {
    for (const failure of result.failures) {
      console.error(failure);
    }
    process.exit(1);
  }

  console.log(`[boundary-check] PASS ${result.filesScanned} files scanned`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
