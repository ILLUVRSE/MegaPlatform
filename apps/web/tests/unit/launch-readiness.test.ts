import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeReadinessState = vi.hoisted(() => ({
  ok: true,
  missingDocs: [] as string[],
  missingApis: [] as string[],
  missingRuntimeFiles: [] as string[],
  checkedAt: "2026-03-11T00:00:00.000Z",
  phases: [301]
}));

vi.mock("@/lib/platformRuntimeReadiness", () => ({
  evaluatePlatformRuntimeReadiness: vi.fn(() => runtimeReadinessState)
}));

import { buildLaunchReadiness } from "@/lib/platformGovernance";

describe("launch readiness", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://db");
    vi.stubEnv("REDIS_URL", "redis://cache");
    vi.stubEnv("NEXTAUTH_URL", "https://illuvrse.test");
    vi.stubEnv("NEXTAUTH_SECRET", "secret");
    vi.stubEnv("S3_ENDPOINT", "https://s3.local");
    vi.stubEnv("S3_BUCKET", "illuvrse");
    vi.stubEnv("S3_ACCESS_KEY", "access");
    vi.stubEnv("S3_SECRET_KEY", "secret");
    vi.stubEnv("LIVEKIT_API_KEY", "lk_key");
    vi.stubEnv("LIVEKIT_API_SECRET", "lk_secret");
    runtimeReadinessState.ok = true;
    runtimeReadinessState.missingDocs = [];
    runtimeReadinessState.missingApis = [];
    runtimeReadinessState.missingRuntimeFiles = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes launch gates when runtime readiness and critical dependencies are healthy", async () => {
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ total: 10n, failed: 0n }])
        .mockResolvedValueOnce([{ active: 2n, healthy: 2n }])
        .mockResolvedValueOnce([{ type: "SHORT_RENDER", count: 1n }])
        .mockResolvedValueOnce([{ bytes: 1024n }])
        .mockResolvedValueOnce([{ count: 10n }])
        .mockResolvedValueOnce([{ oldest: new Date("2026-03-01T00:00:00.000Z"), total: 5n }])
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([{ ok: 1 }])
    };

    const readiness = await buildLaunchReadiness(prisma);

    expect(readiness.checks.runtime_readiness_failures).toBe(0);
    expect(readiness.checks.critical_dependency_failures).toBe(0);
    expect(readiness.blockers).toEqual([]);
  });

  it("blocks launch when runtime truth is missing or critical dependencies are degraded", async () => {
    runtimeReadinessState.ok = false;
    runtimeReadinessState.missingDocs = ["docs/platform-runtime-truth-readiness-gate.md"];
    delete process.env.S3_ENDPOINT;

    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ total: 10n, failed: 0n }])
        .mockResolvedValueOnce([{ active: 2n, healthy: 2n }])
        .mockResolvedValueOnce([{ type: "SHORT_RENDER", count: 1n }])
        .mockResolvedValueOnce([{ bytes: 1024n }])
        .mockResolvedValueOnce([{ count: 10n }])
        .mockResolvedValueOnce([{ oldest: new Date("2026-03-01T00:00:00.000Z"), total: 5n }])
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([{ ok: 1 }])
    };

    const readiness = await buildLaunchReadiness(prisma);

    expect(readiness.checks.runtime_readiness_failures).toBe(1);
    expect(readiness.checks.critical_dependency_failures).toBeGreaterThan(0);
    expect(readiness.blockers.map((gate) => gate.checkKey)).toEqual(
      expect.arrayContaining(["runtime_readiness_failures", "critical_dependency_failures"])
    );
  });
});
