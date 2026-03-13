import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const writeAuditMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  feedPost: {
    findUnique: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("@/lib/rbac", () => ({
  requireAdmin: requireAdminMock
}));

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: writeAuditMock,
  writePolicyAudit: writeAuditMock
}));

import { POST as enforcePolicy } from "@/app/api/admin/policies/enforce/route";
import { POST as hideFeedPost } from "@/app/api/admin/feed/[id]/hide/route";

describe("policy enforcement integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: "admin-1", role: "admin" } } });
    prismaMock.feedPost.findUnique.mockResolvedValue({
      id: "post-1",
      isPinned: false,
      isFeatured: true
    });
    prismaMock.feedPost.update.mockResolvedValue({ id: "post-1" });
  });

  it("rejects a YAML-defined policy violation through the enforce endpoint", async () => {
    const response = await enforcePolicy(
      new Request("http://localhost/api/admin/policies/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "infrastructure",
          action: "db.destructive",
          target: {
            kind: "infra",
            resource: "studioAsset",
            operation: "bulkDelete"
          },
          attributes: {
            days: 7,
            candidateCount: 25
          },
          policy: `
version: "3.1"
defaultEffect: deny
rules:
  - id: deny-recent-cleanup
    scope: infrastructure
    action: db.destructive
    effect: deny
    priority: 200
    targetKind: infra
    resources: [studioAsset]
    operations: [bulkDelete]
    conditions:
      - key: days
        operator: lte
        value: 14
`
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("policy_violation");
    expect(payload.decision.matchedRuleId).toBe("deny-recent-cleanup");
    expect(writeAuditMock).toHaveBeenCalledWith(
      "admin-1",
      expect.objectContaining({
        matchedRuleId: "deny-recent-cleanup",
        resource: "studioAsset"
      })
    );
  });

  it("blocks featured content takedown before mutating the post", async () => {
    const response = await hideFeedPost(
      new Request("http://localhost/api/admin/feed/post-1/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "copyright strike", ticketId: "CASE-42" })
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("policy_violation");
    expect(payload.decision.matchedRuleId).toBe("deny-featured-content-takedown");
    expect(prismaMock.feedPost.update).not.toHaveBeenCalled();
    expect(writeAuditMock).toHaveBeenCalledWith(
      "admin-1",
      expect.objectContaining({
        resource: "feed-post",
        matchedRuleId: "deny-featured-content-takedown"
      })
    );
  });
});
