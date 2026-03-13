#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOCKFILE_ORDER = ["pnpm-lock.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock"];
const DEFAULT_CACHE_KIND = "node-modules";
const DEFAULT_PACKAGE = ".";
const CACHE_KINDS = new Set(["node-modules", "pnpm-store", "docker"]);

function parseArgs(argv) {
  const args = { positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--check") {
      args.check = true;
      continue;
    }
    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const nextValue = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined && nextValue && !nextValue.startsWith("--")) {
        args[key] = nextValue;
        index += 1;
      } else if (inlineValue !== undefined) {
        args[key] = inlineValue;
      } else {
        args[key] = true;
      }
      continue;
    }
    args.positional.push(token);
  }
  return args;
}

function normalizePackageArg(value = DEFAULT_PACKAGE) {
  if (value === "." || value === "./" || value === "") {
    return ".";
  }
  return value.replace(/^[./]+/, "").replace(/\/+$/, "");
}

function slugify(value) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveWorkspacePackages() {
  const rootPackageJsonPath = path.join(ROOT_DIR, "package.json");
  const rootPackageJson = readJson(rootPackageJsonPath);
  const workspaceEntries = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : [];
  const packageDirs = [".", ...workspaceEntries]
    .map((entry) => normalizePackageArg(entry))
    .filter((entry, index, values) => values.indexOf(entry) === index)
    .filter((entry) => existsSync(path.join(ROOT_DIR, entry, "package.json")));

  return packageDirs.map((relativeDir) => {
    const packageJsonPath = path.join(ROOT_DIR, relativeDir, "package.json");
    const packageJson = readJson(packageJsonPath);
    const packageSlug = relativeDir === "." ? "root" : slugify(relativeDir);
    const dockerfilePath = relativeDir === "." ? null : path.join(ROOT_DIR, relativeDir, "Dockerfile");
    return {
      relativeDir,
      packageJsonPath,
      packageJson,
      packageName: packageJson.name ?? packageSlug,
      packageSlug,
      dockerfilePath: dockerfilePath && existsSync(dockerfilePath) ? dockerfilePath : null,
    };
  });
}

function getPackageConfig(packageArg) {
  const target = normalizePackageArg(packageArg);
  const packages = resolveWorkspacePackages();
  const packageConfig = packages.find((entry) => entry.relativeDir === target);
  if (!packageConfig) {
    throw new Error(`Unknown package "${packageArg}". Expected one of: ${packages.map((entry) => entry.relativeDir).join(", ")}`);
  }
  return packageConfig;
}

function detectPackageManager() {
  const lockfileName = LOCKFILE_ORDER.find((entry) => existsSync(path.join(ROOT_DIR, entry)));
  if (!lockfileName) {
    return { manager: "npm", lockfileName: null, fallback: true };
  }
  if (lockfileName === "pnpm-lock.yaml") {
    return { manager: "pnpm", lockfileName, fallback: false };
  }
  if (lockfileName === "yarn.lock") {
    return { manager: "yarn", lockfileName, fallback: true };
  }
  return { manager: "npm", lockfileName, fallback: lockfileName !== "package-lock.json" ? true : false };
}

function listHashInputs(packageConfig, cacheKind, managerInfo) {
  const inputs = [path.join(ROOT_DIR, "package.json")];
  if (managerInfo.lockfileName) {
    inputs.push(path.join(ROOT_DIR, managerInfo.lockfileName));
  }
  if (packageConfig.relativeDir !== ".") {
    inputs.push(packageConfig.packageJsonPath);
  }
  if (cacheKind === "docker" && packageConfig.dockerfilePath) {
    inputs.push(packageConfig.dockerfilePath);
  }
  return inputs.filter((entry, index, values) => values.indexOf(entry) === index);
}

function hashFiles(filePaths) {
  const hash = createHash("sha256");
  for (const filePath of filePaths) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    hash.update(`${relativePath}\n`);
    hash.update(readFileSync(filePath));
    hash.update("\n");
  }
  return hash.digest("hex").slice(0, 16);
}

function buildCacheMetadata(packageArg, cacheKind = DEFAULT_CACHE_KIND) {
  if (!CACHE_KINDS.has(cacheKind)) {
    throw new Error(`Unsupported cache kind "${cacheKind}". Expected one of: ${Array.from(CACHE_KINDS).join(", ")}`);
  }
  const packageConfig = getPackageConfig(packageArg);
  const managerInfo = detectPackageManager();
  const runnerOs = process.env.RUNNER_OS ?? os.platform();
  const packageScope = packageConfig.packageSlug;
  const basePrefix = [
    "illuvrse-news",
    slugify(runnerOs),
    managerInfo.manager,
    cacheKind,
    packageScope,
  ].join("-");
  const hashInputs = listHashInputs(packageConfig, cacheKind, managerInfo);
  const hash = hashFiles(hashInputs);

  return {
    cacheKind,
    key: `${basePrefix}-${hash}`,
    restoreKeys: [`${basePrefix}-`, `illuvrse-news-${slugify(runnerOs)}-${managerInfo.manager}-${cacheKind}-`],
    hash,
    hashInputs: hashInputs.map((entry) => path.relative(ROOT_DIR, entry)),
    manager: managerInfo.manager,
    managerFallback: managerInfo.fallback,
    lockfile: managerInfo.lockfileName,
    packageDir: packageConfig.relativeDir,
    packageName: packageConfig.packageName,
    packageSlug: packageConfig.packageSlug,
  };
}

function escapeMultilineValue(value) {
  return value.replace(/\r/g, "");
}

async function writeGitHubOutput(entries) {
  const outputFile = process.env.GITHUB_OUTPUT;
  const lines = [];
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      lines.push(`${key}<<EOF`);
      lines.push(escapeMultilineValue(value.join("\n")));
      lines.push("EOF");
      continue;
    }
    lines.push(`${key}=${escapeMultilineValue(String(value))}`);
  }
  const serialized = `${lines.join("\n")}\n`;

  if (outputFile) {
    await writeFile(outputFile, serialized, { flag: "a" });
    return;
  }
  process.stdout.write(serialized);
}

async function resolvePnpmStorePath() {
  const envPath = process.env.PNPM_STORE_PATH;
  if (envPath) {
    return envPath;
  }
  return path.join(ROOT_DIR, ".pnpm-store");
}

function buildNodeModulesPaths() {
  const packages = resolveWorkspacePackages();
  const dirs = packages
    .map((entry) => path.join(ROOT_DIR, entry.relativeDir, "node_modules"))
    .filter((entry, index, values) => values.indexOf(entry) === index);
  return dirs.map((entry) => path.relative(ROOT_DIR, entry));
}

async function buildDockerMetadata(packageArg) {
  const packageConfig = getPackageConfig(packageArg);
  const pnpmStorePath = await resolvePnpmStorePath();
  const nodeModulesPaths = buildNodeModulesPaths();
  const dockerCache = buildCacheMetadata(packageArg, "docker");
  return {
    packageDir: packageConfig.relativeDir,
    dockerCacheKey: dockerCache.key,
    dockerCacheScope: `docker-${dockerCache.packageSlug}`,
    dockerCacheFrom: `type=gha,scope=docker-${dockerCache.packageSlug}`,
    dockerCacheTo: `type=gha,mode=max,scope=docker-${dockerCache.packageSlug}`,
    pnpmStorePath: path.isAbsolute(pnpmStorePath) ? pnpmStorePath : path.join(ROOT_DIR, pnpmStorePath),
    nodeModulesPaths,
  };
}

async function runCheck() {
  const packages = resolveWorkspacePackages();
  const managerInfo = detectPackageManager();
  const toolingDir = path.join(ROOT_DIR, "tooling", "ci");
  const docsDir = path.join(ROOT_DIR, "docs");
  await mkdir(toolingDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  const summaries = [];
  for (const packageConfig of packages) {
    const nodeModulesCache = buildCacheMetadata(packageConfig.relativeDir, "node-modules");
    const dockerCache = buildCacheMetadata(packageConfig.relativeDir, "docker");
    summaries.push({
      packageDir: packageConfig.relativeDir,
      manager: nodeModulesCache.manager,
      lockfile: nodeModulesCache.lockfile ?? "none",
      fallback: nodeModulesCache.managerFallback ? "yes" : "no",
      nodeModulesKey: nodeModulesCache.key,
      dockerKey: dockerCache.key,
    });
  }

  const missingNodeModules = [];
  for (const entry of buildNodeModulesPaths()) {
    const absolutePath = path.join(ROOT_DIR, entry);
    if (!existsSync(absolutePath)) {
      missingNodeModules.push(entry);
    }
  }

  const result = {
    rootDir: await realpath(ROOT_DIR),
    packageManager: managerInfo.manager,
    lockfile: managerInfo.lockfileName ?? "none",
    fallbackMode: managerInfo.fallback,
    packages: summaries,
    nodeModulesPresent: missingNodeModules.length === 0,
    missingNodeModules,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args.positional[0];
  const packageArg = args.package ?? DEFAULT_PACKAGE;
  const cacheKind = args.cache ?? DEFAULT_CACHE_KIND;

  if (args.check) {
    await runCheck();
    return;
  }

  if (!command) {
    throw new Error("Missing command. Expected one of: key, restore, gha, docker");
  }

  if (command === "key") {
    const metadata = buildCacheMetadata(packageArg, cacheKind);
    process.stdout.write(`${metadata.key}\n`);
    return;
  }

  if (command === "restore") {
    const metadata = buildCacheMetadata(packageArg, cacheKind);
    process.stdout.write(`${metadata.restoreKeys.join("\n")}\n`);
    return;
  }

  if (command === "gha") {
    const metadata = buildCacheMetadata(packageArg, cacheKind);
    await writeGitHubOutput({
      key: metadata.key,
      restore_keys: metadata.restoreKeys,
      manager: metadata.manager,
      lockfile: metadata.lockfile ?? "",
      package_dir: metadata.packageDir,
      fallback: metadata.managerFallback ? "true" : "false",
    });
    return;
  }

  if (command === "docker") {
    const metadata = await buildDockerMetadata(packageArg);
    await writeGitHubOutput(metadata);
    return;
  }

  throw new Error(`Unknown command "${command}". Expected one of: key, restore, gha, docker`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
