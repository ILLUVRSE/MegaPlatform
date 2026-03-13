import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const buildSloStatusMock = vi.hoisted(() => vi.fn());
const buildServiceDependencyHealthMock = vi.hoisted(() => vi.fn());
const buildPartyVoiceObservabilityCardMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/rbac", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/platformGovernance", () => ({
  buildSloStatus: buildSloStatusMock,
  buildServiceDependencyHealth: buildServiceDependencyHealthMock
}));
vi.mock("@/lib/partyVoicePerf", () => ({
  buildPartyVoiceObservabilityCard: buildPartyVoiceObservabilityCardMock
}));

import { GET } from "@/app/api/admin/observability/summary/route";

describe("observability summary api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthorized access", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, session: null });
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns machine-readable SLO and service health payloads", async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1" } } });
    buildSloStatusMock.mockResolvedValue({
      slos: [
        {
          id: "live-channel-health",
          name: "Live Channel Healthy Ratio",
          actual: 0.99,
          target: 0.95,
          operator: ">=",
          unit: "ratio",
          severity: "critical",
          pass: true
        }
      ],
      breaches: [],
      generatedAt: "2026-03-11T00:00:00.000Z",
      dimensions: {}
    });
    buildServiceDependencyHealthMock.mockResolvedValue({
      dependencies: [{ id: "postgres-primary", status: "healthy", criticality: "critical" }],
      summary: { critical: 1, high: 0, medium: 0, low: 0, unhealthy: 0, degraded: 0 },
      generatedAt: "2026-03-11T00:00:00.000Z"
    });
    buildPartyVoiceObservabilityCardMock.mockResolvedValue({
      available: true,
      status: "pass",
      generatedAt: "2026-03-11T00:00:00.000Z",
      headline: {
        connectP95Ms: 700,
        connectSuccessRatioUnder1s: 1,
        medianJitterMs: 22,
        packetLossRatio: 0.01,
        medianReconnectMs: 250
      },
      slos: []
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.timestamp).toBe("2026-03-11T00:00:00.000Z");
    expect(payload.runbook).toBe("docs/ops_brain/runbooks/incident-response.md");
    expect(payload.sloSummaries).toHaveLength(1);
    expect(payload.serviceHealth).toHaveLength(1);
    expect(payload.serviceHealthSummary.unhealthy).toBe(0);
    expect(payload.partyVoice.status).toBe("pass");
    expect(payload.partyVoice.headline.medianReconnectMs).toBe(250);
  });
});
