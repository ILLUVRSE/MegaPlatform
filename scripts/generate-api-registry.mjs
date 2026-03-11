#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "apps", "web", "app", "api");
const OUTPUT = path.join(ROOT, "docs", "api-registry.web.json");

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

function normalizeRoute(filePath) {
  const rel = path.relative(API_ROOT, filePath).replace(/\\/g, "/");
  const withoutSuffix = rel.replace(/\/route\.ts$/, "");
  return `/api/${withoutSuffix}`.replace(/\/+/g, "/");
}

function resolveMethods(filePath) {
  const source = readFileSync(filePath, "utf-8");
  const matches = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)];
  const methods = [...new Set(matches.map((m) => m[1]))];
  return methods.sort();
}

const routeFiles = walk(API_ROOT).sort();
const routes = routeFiles.map((filePath) => ({
  route: normalizeRoute(filePath),
  methods: resolveMethods(filePath),
  source: path.relative(ROOT, filePath).replace(/\\/g, "/")
}));

const payload = {
  scope: "apps/web/app/api",
  routeCount: routes.length,
  routes
};

writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`[api-registry] Wrote ${routes.length} routes to ${path.relative(ROOT, OUTPUT)}\n`);
