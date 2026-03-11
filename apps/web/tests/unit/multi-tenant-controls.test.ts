import { describe, expect, it } from "vitest";
import { authorizeTenantBoundary } from "@/lib/tenantControls";

describe("multi-tenant controls", () => {
  it("allows requests within tenant API and module boundaries", async () => {
    const result = await authorizeTenantBoundary({
      tenantId: "partner-alpha",
      requestPath: "/news",
      moduleKey: "news",
      rowTenantId: "partner-alpha"
    });

    expect(result.ok).toBe(true);
  });

  it("blocks cross-tenant row access at data layer", async () => {
    const result = await authorizeTenantBoundary({
      tenantId: "partner-alpha",
      requestPath: "/news",
      moduleKey: "news",
      rowTenantId: "core"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("data_tenant_mismatch");
  });
});
