import { describe, expect, it } from "vitest";
import { buildShowEpisodePublishQc, buildShowProjectPublishQc } from "@/lib/studioPublishQc";
import { WATCH_PLACEHOLDER_ASSET_URL } from "@/lib/studioWatchPublishConfig";

describe("studio publish QC", () => {
  it("blocks show publish when required metadata is missing", () => {
    const result = buildShowProjectPublishQc({
      id: "show-1",
      title: "Nebula Nights",
      slug: "nebula-nights",
      description: ""
    });

    expect(result.canPublish).toBe(false);
    expect(result.summary.blockingFailures).toBe(1);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "show-description",
          status: "fail",
          blocking: true
        })
      ])
    );
  });

  it("blocks episode publish when parent show linkage is invalid", () => {
    const result = buildShowEpisodePublishQc({
      episode: {
        id: "episode-1",
        title: "Pilot",
        slug: "pilot",
        synopsis: "The crew intercepts a broken signal.",
        showProjectId: null
      },
      parentShow: null,
      watchEpisode: null
    });

    expect(result.canPublish).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "episode-parent-show",
          status: "fail",
          blocking: true
        })
      ])
    );
  });

  it("keeps episode publish allowed when watch falls back to the configured placeholder asset", () => {
    const result = buildShowEpisodePublishQc({
      episode: {
        id: "episode-2",
        title: "Pilot",
        slug: "pilot",
        synopsis: "The crew intercepts a broken signal.",
        showProjectId: "show-1"
      },
      parentShow: {
        id: "show-1",
        title: "Nebula Nights",
        slug: "nebula-nights",
        description: "A late-night sci-fi anthology."
      },
      watchEpisode: {
        assetUrl: WATCH_PLACEHOLDER_ASSET_URL
      }
    });

    expect(result.canPublish).toBe(true);
    expect(result.summary.warnings).toBe(1);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "watch-playback-asset",
          status: "warn",
          blocking: false
        })
      ])
    );
  });
});
