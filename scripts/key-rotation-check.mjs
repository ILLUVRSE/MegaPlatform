#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "ops", "governance", "key-rotation.json");

try {
  const parsed = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(parsed)) {
    process.stderr.write("[key-rotation] FAIL: manifest must be an array\n");
    process.exit(1);
  }

  const now = Date.now();
  const overdue = [];
  for (const entry of parsed) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    const maxAgeDays = Number(entry?.maxAgeDays ?? NaN);
    const rotatedAt = Date.parse(String(entry?.lastRotatedAt ?? ""));
    if (!id || !Number.isFinite(maxAgeDays) || !Number.isFinite(rotatedAt)) {
      process.stderr.write(`[key-rotation] FAIL: invalid manifest row ${JSON.stringify(entry)}\n`);
      process.exit(1);
    }

    const ageDays = (now - rotatedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > maxAgeDays) {
      overdue.push({ id, ageDays: Math.floor(ageDays), maxAgeDays });
    }
  }

  if (overdue.length > 0) {
    process.stderr.write(
      `[key-rotation] FAIL: ${overdue.length} overdue key(s): ${overdue.map((item) => item.id).join(", ")}\n`
    );
    process.exit(1);
  }

  process.stdout.write(`[key-rotation] PASS: ${parsed.length} key rotation policies in compliance\n`);
} catch (error) {
  process.stderr.write(`[key-rotation] FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
