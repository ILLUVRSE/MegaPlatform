import { describe, expect, it } from "vitest";
import {
  getAdminDecision,
  getSessionDecision,
  isSessionProtectedPath,
  privilegedRouteMatcher
} from "@/src/domains/platform-core/auth/middlewarePolicy";

describe("middleware policy", () => {
  it("protects privileged non-admin write surfaces", () => {
    expect(isSessionProtectedPath("/api/studio/projects/123/jobs")).toBe(true);
    expect(isSessionProtectedPath("/api/uploads/sign")).toBe(true);
    expect(isSessionProtectedPath("/api/party/abc/playback")).toBe(true);
    expect(privilegedRouteMatcher).toContain("/api/studio/:path*");
  });

  it("distinguishes admin authorization from generic session checks", () => {
    expect(getSessionDecision({ role: "user" })).toEqual({ allowed: true, status: 200 });
    expect(getAdminDecision({ role: "user", permissions: [] })).toEqual({ allowed: false, status: 403 });
    expect(getAdminDecision({ role: "admin", permissions: [] })).toEqual({ allowed: true, status: 200 });
  });
});
