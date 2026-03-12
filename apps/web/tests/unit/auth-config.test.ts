import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

describe("auth config validation", () => {
  it("rejects production when NEXTAUTH_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "false";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("@/lib/env");

    expect(() => assertAuthSecurityConfig()).toThrow("NEXTAUTH_URL must be set in production.");
  });

  it("rejects production when NEXTAUTH_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXTAUTH_URL = "https://illuvrse.example";
    delete process.env.NEXTAUTH_SECRET;
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "false";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("@/lib/env");

    expect(() => assertAuthSecurityConfig()).toThrow("NEXTAUTH_SECRET must be set to a strong value in production.");
  });

  it("rejects production when dev credentials auth is enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXTAUTH_URL = "https://illuvrse.example";
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "true";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("@/lib/env");

    expect(() => assertAuthSecurityConfig()).toThrow("ALLOW_DEV_CREDENTIALS_AUTH must be disabled in production.");
  });

  it("accepts production when required auth settings are present and dev credentials are disabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXTAUTH_URL = "https://illuvrse.example";
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.ALLOW_DEV_CREDENTIALS_AUTH = "false";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { assertAuthSecurityConfig } = await import("@/lib/env");

    expect(() => assertAuthSecurityConfig()).not.toThrow();
  });
});
