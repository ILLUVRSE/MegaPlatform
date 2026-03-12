import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

describe("auth config validation", () => {
  it("rejects production when dev credentials auth is enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXTAUTH_URL = "https://illuvrse.example";
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "true";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("../../../apps/web/lib/env");

    expect(() => assertAuthSecurityConfig()).toThrow("ALLOW_DEV_CREDENTIALS_AUTH must be disabled in production.");
  });

  it("accepts production when required auth settings are present and dev credentials are disabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXTAUTH_URL = "https://illuvrse.example";
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "false";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("../../../apps/web/lib/env");

    expect(() => assertAuthSecurityConfig()).not.toThrow();
  });
});
