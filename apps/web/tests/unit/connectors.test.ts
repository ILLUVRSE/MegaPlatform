import { describe, expect, it } from "vitest";
import { runConnector } from "@/lib/connectors";

describe("ingestion connectors", () => {
  it("runs enabled production-grade connector", async () => {
    const result = await runConnector("partner-news-catalog");
    expect(result?.status).toBe("ok");
    expect(result?.importedItems).toBeGreaterThan(0);
  });
});
