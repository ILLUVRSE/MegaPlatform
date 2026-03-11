#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "ops", "governance", "design-tokens-v2.json");
const outputPath = path.join(root, "packages", "ui", "src", "tokens.css");

const rows = JSON.parse(readFileSync(manifestPath, "utf-8"));
if (!Array.isArray(rows)) {
  throw new Error("design-tokens-v2.json must be an array");
}

const seen = new Set();
const toCssVar = (name) => `--illuvrse-${name.replace(/\./g, "-")}`;
const lines = [];

for (const row of rows) {
  if (!row || typeof row !== "object") {
    throw new Error("token row must be an object");
  }

  const name = typeof row.name === "string" ? row.name.trim() : "";
  const value = typeof row.value === "string" ? row.value.trim() : "";
  if (!name || !value) {
    throw new Error("token row requires non-empty name/value");
  }
  if (seen.has(name)) {
    throw new Error(`duplicate token name: ${name}`);
  }
  seen.add(name);
  lines.push(`  ${toCssVar(name)}: ${value};`);
}

const aliases = [
  "  --illuvrse-bg: var(--illuvrse-color-bg-canvas);",
  "  --illuvrse-surface: var(--illuvrse-color-bg-surface);",
  "  --illuvrse-border: var(--illuvrse-color-border-default);",
  "  --illuvrse-text: var(--illuvrse-color-text-default);",
  "  --illuvrse-muted: var(--illuvrse-color-text-muted);",
  "  --illuvrse-primary: var(--illuvrse-color-brand-primary);",
  "  --illuvrse-accent: var(--illuvrse-color-brand-accent);",
  "  --illuvrse-danger: var(--illuvrse-color-feedback-danger);",
  "  --illuvrse-success: var(--illuvrse-color-feedback-success);",
  "  --illuvrse-radius-button: var(--illuvrse-radius-pill);",
  "  --illuvrse-modal-shadow: var(--illuvrse-depth-modal);",
  "  --illuvrse-font-xs: var(--illuvrse-type-size-xs);",
  "  --illuvrse-font-sm: var(--illuvrse-type-size-sm);",
  "  --illuvrse-font-base: var(--illuvrse-type-size-base);",
  "  --illuvrse-font-lg: var(--illuvrse-type-size-lg);",
  "  --illuvrse-font-xl: var(--illuvrse-type-size-xl);",
  "  --illuvrse-font-2xl: var(--illuvrse-type-size-2xl);",
  "  --illuvrse-font-3xl: var(--illuvrse-type-size-3xl);"
];

const output = `:root {\n${lines.join("\n")}\n\n${aliases.join("\n")}\n}\n`;
writeFileSync(outputPath, output);
process.stdout.write(`[design-tokens] Wrote ${rows.length} tokens to ${path.relative(root, outputPath)}\n`);
