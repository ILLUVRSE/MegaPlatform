import { describe, expect, it } from "vitest";
import {
  buildPartyToStudioHref,
  buildWatchToPartyHref,
  buildWatchToStudioHref,
  summarizeJourneyContext
} from "@/lib/journeyBridge";

describe("journey bridge", () => {
  it("builds cross-module links with context query params", () => {
    expect(buildWatchToPartyHref({ showSlug: "nova", episodeId: "ep-1" })).toContain("source=watch");
    expect(buildWatchToStudioHref({ showSlug: "nova" })).toContain("show=nova");
    expect(buildPartyToStudioHref("ABC123")).toContain("partyCode=ABC123");
  });

  it("summarizes incoming context labels", () => {
    const watch = summarizeJourneyContext({ source: "watch", show: "nova", episodeId: "ep-1" });
    expect(watch?.label).toContain("From Watch");
    const party = summarizeJourneyContext({ source: "party", partyCode: "ABC123" });
    expect(party?.label).toContain("ABC123");
  });
});
