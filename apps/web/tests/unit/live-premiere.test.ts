import { describe, expect, it } from "vitest";
import { getLivePremiereStatus } from "@/lib/livePremiere";

describe("live premiere state", () => {
  it("treats disabled metadata as normal VOD", () => {
    expect(getLivePremiereStatus({}, new Date("2026-03-13T12:00:00.000Z"))).toMatchObject({
      isPremiereEnabled: false,
      state: "VOD"
    });
  });

  it("returns upcoming before the premiere start time", () => {
    expect(
      getLivePremiereStatus(
        {
          isPremiereEnabled: true,
          premiereStartsAt: new Date("2026-03-13T13:00:00.000Z"),
          chatEnabled: true,
          lengthSeconds: 1800
        },
        new Date("2026-03-13T12:00:00.000Z")
      )
    ).toMatchObject({
      isPremiereEnabled: true,
      state: "UPCOMING",
      chatEnabled: true
    });
  });

  it("returns live between the start and effective end", () => {
    expect(
      getLivePremiereStatus(
        {
          isPremiereEnabled: true,
          premiereStartsAt: new Date("2026-03-13T12:00:00.000Z"),
          premiereEndsAt: new Date("2026-03-13T12:30:00.000Z"),
          lengthSeconds: 1800
        },
        new Date("2026-03-13T12:10:00.000Z")
      )
    ).toMatchObject({
      isPremiereEnabled: true,
      state: "LIVE"
    });
  });

  it("falls back to VOD after the effective end time", () => {
    expect(
      getLivePremiereStatus(
        {
          isPremiereEnabled: true,
          premiereStartsAt: new Date("2026-03-13T12:00:00.000Z"),
          lengthSeconds: 600
        },
        new Date("2026-03-13T12:12:00.000Z")
      )
    ).toMatchObject({
      isPremiereEnabled: true,
      state: "VOD"
    });
  });
});
