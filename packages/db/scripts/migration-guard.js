#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const dangerous = args.includes("--dangerous-yes");
const justificationArg = args.find((arg) => arg.startsWith("--justification="));
const justificationPath = justificationArg ? justificationArg.slice("--justification=".length) : null;

const isProductionLike = (process.env.NODE_ENV ?? "production") !== "development";
if (!isProductionLike) {
  console.log("Migration guard OK (development mode).");
  process.exit(0);
}

const migrationFileArg = args.find((arg) => arg.endsWith(".sql"));
if (!migrationFileArg) {
  console.log("Migration guard OK (no migration file supplied).");
  process.exit(0);
}

const sql = readFileSync(path.resolve(migrationFileArg), "utf8");
const destructivePattern = /\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+SCHEMA|TRUNCATE|DELETE\s+FROM)\b/i;

if (!destructivePattern.test(sql)) {
  console.log("Migration guard OK");
  process.exit(0);
}

if (!dangerous) {
  console.error("Destructive migration detected. Re-run with --dangerous-yes and --justification=<file>.");
  process.exit(2);
}

if (!justificationPath) {
  console.error("Missing justification file.");
  process.exit(2);
}

const justification = readFileSync(path.resolve(justificationPath), "utf8").trim();
if (!justification) {
  console.error("Justification file must not be empty.");
  process.exit(2);
}

console.log("Migration guard OK");
