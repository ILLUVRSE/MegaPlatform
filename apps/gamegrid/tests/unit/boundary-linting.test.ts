import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBoundariesConfig, runBoundaryCheck } from "../../../../scripts/check-boundaries.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const boundariesConfig = loadBoundariesConfig(path.resolve(testDir, "../../../../packages/governance/boundaries-config.json"));
const tmpDirs: string[] = [];

function writeFixture(rootDir: string, relativePath: string, source: string) {
  const target = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function createFixtureRoot() {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "illuvrse-boundaries-"));
  tmpDirs.push(rootDir);
  return rootDir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const rootDir = tmpDirs.pop();
    if (!rootDir) {
      continue;
    }
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("boundary linting", () => {
  it("fails when GameGrid runtime imports XR runtime code directly", () => {
    const fixtureRoot = createFixtureRoot();

    writeFixture(
      fixtureRoot,
      "apps/gamegrid/src/runtime/session.ts",
      [
        "import { evaluateXrLightingPipeline } from '../../../web/lib/xrLightingPipeline';",
        "",
        "export const sessionBridge = evaluateXrLightingPipeline;"
      ].join("\n")
    );
    writeFixture(
      fixtureRoot,
      "apps/web/lib/xrLightingPipeline.ts",
      "export const evaluateXrLightingPipeline = () => 'ok';\n"
    );

    const result = runBoundaryCheck({
      rootDir: fixtureRoot,
      config: boundariesConfig,
      files: ["apps/gamegrid/src/runtime/session.ts"]
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual(
      expect.stringContaining("GameGrid runtime must not import XR runtime code directly")
    );
  });

  it("allows imports through the adapter interface boundary", () => {
    const fixtureRoot = createFixtureRoot();

    writeFixture(
      fixtureRoot,
      "apps/gamegrid/src/adapters/xr/sessionBridge.ts",
      [
        "import { createXrGamegridAdapter } from '../../../../web/lib/adapters/gamegrid/sessionBridge';",
        "",
        "export const sessionBridge = createXrGamegridAdapter();"
      ].join("\n")
    );
    writeFixture(
      fixtureRoot,
      "apps/web/lib/adapters/gamegrid/sessionBridge.ts",
      "export const createXrGamegridAdapter = () => ({ kind: 'adapter' as const });\n"
    );

    const result = runBoundaryCheck({
      rootDir: fixtureRoot,
      config: boundariesConfig,
      files: ["apps/gamegrid/src/adapters/xr/sessionBridge.ts"]
    });

    expect(result.ok).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});
