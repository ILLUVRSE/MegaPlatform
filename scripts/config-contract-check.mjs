#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const deploymentPath = path.join(root, "ops", "governance", "deployment.json");
const envExamplePath = path.join(root, ".env.example");

function parseEnvKeys(content) {
  return new Set(
    content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0].trim())
      .filter(Boolean)
  );
}

let failed = false;
const deployment = JSON.parse(readFileSync(deploymentPath, "utf-8"));
const envKeys = parseEnvKeys(readFileSync(envExamplePath, "utf-8"));

if (!Array.isArray(deployment)) {
  console.error("[config-contract] FAIL deployment.json must be an array");
  process.exit(1);
}

for (const entry of deployment) {
  if (!entry || typeof entry !== "object") {
    failed = true;
    console.error("[config-contract] FAIL invalid deployment entry");
    continue;
  }
  const env = String(entry.env ?? "");
  const requiredEnv = Array.isArray(entry.requiredEnv) ? entry.requiredEnv : [];
  if (!env) {
    failed = true;
    console.error("[config-contract] FAIL deployment entry missing env");
  }
  for (const key of requiredEnv) {
    if (!envKeys.has(key)) {
      failed = true;
      console.error(`[config-contract] FAIL missing ${key} in .env.example (required by ${env})`);
    }
  }
  console.log(`[config-contract] PASS ${env}: ${requiredEnv.length} required keys covered in .env.example`);
}

if (failed) process.exit(1);
