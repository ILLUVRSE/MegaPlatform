import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: { platformEvent: { create: createMock } }
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock
}));

import { POST as completeOnboarding } from "@/app/api/onboarding/complete/route";

describe("onboarding completion API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });
    createMock.mockResolvedValue({ id: "evt-1" });
  });

  it("stores onboarding completion event", async () => {
    const response = await completeOnboarding(
      new Request("http://localhost/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "completed", actionHref: "/watch" })
      })
    );
    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "onboarding_completed",
          href: "/watch"
        })
      })
    );
  });

  it("rejects invalid payload", async () => {
    const response = await completeOnboarding(
      new Request("http://localhost/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "unknown" })
      })
    );
    expect(response.status).toBe(400);
  });
});
