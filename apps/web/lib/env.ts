import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  ALLOW_DEV_CREDENTIALS_AUTH: z.enum(["true", "false"]).optional(),
  REDIS_URL: z.string().url().optional(),
  RATE_LIMIT_STORE: z.enum(["redis", "memory"]).optional()
});

function isWeakSecret(secret: string) {
  return secret.length < 32 || secret.toLowerCase() === "changeme";
}

export function getWebEnv() {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    ALLOW_DEV_CREDENTIALS_AUTH: process.env.ALLOW_DEV_CREDENTIALS_AUTH,
    REDIS_URL: process.env.REDIS_URL,
    RATE_LIMIT_STORE: process.env.RATE_LIMIT_STORE
  });
}

export function assertAuthSecurityConfig() {
  const env = getWebEnv();
  if (env.NODE_ENV !== "production") return;

  if (!env.NEXTAUTH_URL) {
    throw new Error("NEXTAUTH_URL must be set in production.");
  }

  if (!env.NEXTAUTH_SECRET || isWeakSecret(env.NEXTAUTH_SECRET)) {
    throw new Error("NEXTAUTH_SECRET must be set to a strong value in production.");
  }

  if (env.ALLOW_DEV_CREDENTIALS_AUTH === "true") {
    throw new Error("ALLOW_DEV_CREDENTIALS_AUTH must be disabled in production.");
  }

  if (env.RATE_LIMIT_STORE !== "memory" && !env.REDIS_URL) {
    throw new Error("REDIS_URL must be set for distributed rate limiting in production.");
  }
}

export function isDevCredentialsAuthAllowed() {
  const env = getWebEnv();
  if (env.NODE_ENV !== "production") return true;
  return env.ALLOW_DEV_CREDENTIALS_AUTH === "true";
}
