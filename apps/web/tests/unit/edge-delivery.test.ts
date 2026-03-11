import { describe, expect, it } from "vitest";
import { getEdgePerformanceReport, resolveEdgeRoute } from "@/lib/edgeDelivery";

describe("edge delivery", () => {
  it("resolves region to nearest configured edge pop", async () => {
    const route = await resolveEdgeRoute({ modulePath: "/news", region: "ES" });
    expect(route.pop).toBe("eu-west");
    expect(route.url).toContain("eu-west.cdn.illuvrse.local/news");
  });

  it("surfaces latency budget breaches from snapshots", async () => {
    const report = await getEdgePerformanceReport();
    const news = report.budgets.find((row) => row.modulePrefix === "/news");
    expect(news?.status).toBe("breach");
    expect(report.breaches).toBeGreaterThan(0);
  });
});
