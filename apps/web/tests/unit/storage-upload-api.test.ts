import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.hoisted(() => vi.fn());
const uploadBufferMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  AuthzError: class AuthzError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.status = status;
    }
  },
  requireSession: requireSessionMock
}));

vi.mock("@illuvrse/storage", () => ({
  uploadBuffer: uploadBufferMock
}));

vi.mock("@/lib/rateLimit", () => ({
  resolveClientKey: () => "user:ip",
  checkRateLimit: checkRateLimitMock
}));

import { POST as uploadPost } from "@/app/api/storage/upload/route";

describe("storage upload API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSessionMock.mockResolvedValue({ userId: "user-1", role: "user", permissions: [] });
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 19, retryAfterSec: 60 });
    uploadBufferMock.mockResolvedValue("https://cdn.example/uploads/file.png");
  });

  it("rejects unauthenticated upload", async () => {
    requireSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const request = new Request("http://localhost/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "file.png" })
    });
    const response = await uploadPost(request);
    expect(response.status).toBe(401);
  });

  it("uploads when authenticated", async () => {
    const request = new Request("http://localhost/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "file.png" })
    });
    const response = await uploadPost(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.url).toContain("https://cdn.example/");
  });
});
