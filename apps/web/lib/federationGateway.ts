import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const federationPolicySchema = z.object({
  trustedIssuers: z.array(z.string().min(1)).min(1),
  allowedScopes: z.array(z.string().min(1)).min(1)
});

const defaultPolicy = {
  trustedIssuers: ["illuvrse-internal"],
  allowedScopes: ["profile:read", "content:read", "events:write"]
};

export async function loadFederationPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "federation-gateway.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = federationPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function issueFederatedAccess(input: { issuer: string; subject: string; scopes: string[] }) {
  const policy = await loadFederationPolicy();
  if (!policy.trustedIssuers.includes(input.issuer)) {
    return { ok: false as const, reason: "untrusted_issuer" };
  }

  const grantedScopes = input.scopes.filter((scope) => policy.allowedScopes.includes(scope));
  if (grantedScopes.length === 0) {
    return { ok: false as const, reason: "no_scopes_granted" };
  }

  return {
    ok: true as const,
    token: {
      issuer: input.issuer,
      subject: input.subject,
      scopes: grantedScopes,
      issuedAt: new Date().toISOString()
    }
  };
}
