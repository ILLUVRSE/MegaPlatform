import { describe, expect, it } from "vitest";
import { runModuleCertification } from "@/lib/moduleCertification";

describe("module certification", () => {
  it("passes valid module manifests through required checks", async () => {
    const result = await runModuleCertification({
      id: "partner-news",
      name: "Partner News",
      category: "Media",
      route: "/news",
      launchUrl: "https://partner.example.com/news",
      tagline: "Daily updates",
      description: "Partner module"
    });

    expect(result.ok).toBe(true);
  });

  it("blocks publication when required checks fail", async () => {
    const result = await runModuleCertification({
      id: "partner-unsafe",
      name: "Partner Unsafe",
      category: "Media",
      route: "news",
      launchUrl: "http://partner.example.com/news",
      tagline: "test",
      description: "test"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.checks.some((check) => check.name === "route_prefix" && !check.pass)).toBe(true);
    expect(result.checks.some((check) => check.name === "https_launch_url" && !check.pass)).toBe(true);
  });
});
