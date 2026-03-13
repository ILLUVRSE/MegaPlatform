import fs from "node:fs";
import os from "node:os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluatePlatformRuntimeReadiness } from "@/lib/platformRuntimeReadiness";

describe("platform runtime readiness", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const dir of tempRoots) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("passes when the required phase 301-310 assets exist", () => {
    const result = evaluatePlatformRuntimeReadiness(path.resolve(process.cwd(), "..", ".."));

    expect(result.ok).toBe(true);
    expect(result.missingDocs).toEqual([]);
    expect(result.missingRuntimeFiles).toEqual([]);
    expect(result.missingGovernanceManifests).toEqual([]);
    expect(result.apiRegistry.driftDetected).toBe(false);
  });

  it("surfaces registry drift and governance coverage blockers", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "platform-runtime-readiness-"));
    tempRoots.push(root);

    const writeJson = (relativePath: string, value: unknown) => {
      const target = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
    };
    const writeFile = (relativePath: string, value = "export async function GET() {}\n") => {
      const target = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value);
    };

    writeJson("ops/governance/platform-runtime-truth.json", {
      phases: [310],
      requiredDocs: ["docs/runtime.md"],
      requiredRuntimeFiles: ["apps/web/app/api/admin/platform/runtime-readiness/route.ts"],
      requiredApis: ["/api/admin/platform/runtime-readiness"],
      requiredGovernanceManifests: [
        "ops/governance/platform-runtime-truth.json",
        "ops/governance/slos.json",
        "ops/governance/launch-gates.json"
      ],
      requiredSloIds: ["runtime-slo"],
      requiredLaunchGateIds: ["gate-runtime-readiness"]
    });
    writeJson("ops/governance/slos.json", []);
    writeJson("ops/governance/launch-gates.json", []);
    writeJson("docs/api-registry.web.json", {
      scope: "apps/web/app/api",
      routeCount: 0,
      routes: []
    });
    writeFile("docs/runtime.md", "# runtime\n");
    writeFile("apps/web/app/api/admin/platform/runtime-readiness/route.ts");

    const result = evaluatePlatformRuntimeReadiness(root);

    expect(result.ok).toBe(false);
    expect(result.apiRegistry.driftDetected).toBe(true);
    expect(result.unregisteredRequiredApis).toEqual([]);
    expect(result.missingSloIds).toEqual(["runtime-slo"]);
    expect(result.missingLaunchGateIds).toEqual(["gate-runtime-readiness"]);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "api_registry" }),
        expect.objectContaining({ category: "slos", item: "runtime-slo" }),
        expect.objectContaining({ category: "launch_gates", item: "gate-runtime-readiness" })
      ])
    );
  });
});
