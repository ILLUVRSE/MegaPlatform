import { createElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PartyPlayer, { type PlaybackSnapshot } from "@/app/party/components/PartyPlayer";

function buildPlaybackSnapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    currentIndex: 0,
    playbackState: "playing",
    leaderTime: 10_000,
    playbackPositionMs: 5_000,
    leaderId: "host-1",
    timelineRevision: 0,
    syncSequence: 0,
    ...overrides
  };
}

describe("party scrub sync integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(11_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("soft-locks followers to the host position after a scrub rewrite", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const onPlaybackChange = vi.fn();
    const { rerender } = render(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: false,
        playback: buildPlaybackSnapshot(),
        onPlaybackChange,
        refreshKey: 0
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("playback-position").textContent).toBe("6s");
    });

    rerender(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: false,
        playback: buildPlaybackSnapshot({
          leaderTime: 11_000,
          playbackPositionMs: 30_000,
          timelineRevision: 1,
          lastAction: "seek",
          softLockUntil: 12_500
        }),
        onPlaybackChange,
        refreshKey: 0
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("playback-position").textContent).toBe("30s");
    });
  });

  it("repairs follower drift smoothly when the host timeline has not been rewritten", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: false,
        playback: buildPlaybackSnapshot({
          leaderTime: 10_000,
          playbackPositionMs: 10_000
        }),
        onPlaybackChange: vi.fn(),
        refreshKey: 0
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("playback-position").textContent).toBe("11s");
    });

    rerender(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: false,
        playback: buildPlaybackSnapshot({
          leaderTime: 11_000,
          playbackPositionMs: 11_500
        }),
        onPlaybackChange: vi.fn(),
        refreshKey: 0
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("playback-position").textContent).toBe("11s");
    });
  });

  it("reclaims the authoritative host playhead after reconnect via resume handshake", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currentIndex: 0,
            playbackState: "playing",
            leaderTime: 12_000,
            playbackPositionMs: 24_000,
            leaderId: "host-1",
            timelineRevision: 2,
            syncSequence: 9,
            lastAction: "resume",
            lastHeartbeatAt: 12_000
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const onPlaybackChange = vi.fn();
    const { rerender } = render(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: true,
        playback: buildPlaybackSnapshot({
          playbackPositionMs: 18_000
        }),
        onPlaybackChange,
        refreshKey: 0,
        syncGeneration: 0
      })
    );

    rerender(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: true,
        playback: buildPlaybackSnapshot({
          playbackPositionMs: 18_000
        }),
        onPlaybackChange,
        refreshKey: 0,
        syncGeneration: 1
      })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/party/ROOM1/playback",
        expect.objectContaining({
          method: "POST"
        })
      );
    });

    const [, playbackRequest] = fetchMock.mock.calls[1] ?? [];
    expect(JSON.parse(String(playbackRequest?.body))).toMatchObject({
      action: "resume",
      playbackPositionMs: 18_000,
      playbackState: "playing"
    });

    await waitFor(() => {
      expect(onPlaybackChange).toHaveBeenCalledWith(
        expect.objectContaining({
          playbackPositionMs: 24_000,
          lastAction: "resume",
          timelineRevision: 2
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("playback-position").textContent).toBe("24s");
    });
  });

  it("sends a seek action when the host scrubs the timeline", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currentIndex: 0,
            playbackState: "paused",
            leaderTime: 11_000,
            playbackPositionMs: 22_000,
            leaderId: "host-1",
            timelineRevision: 1,
            syncSequence: 1,
            softLockUntil: 12_500,
            lastAction: "seek",
            lastHeartbeatAt: 11_000
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      createElement(PartyPlayer, {
        code: "ROOM1",
        isHost: true,
        playback: buildPlaybackSnapshot({
          playbackState: "paused",
          playbackPositionMs: 5_000
        }),
        onPlaybackChange: vi.fn(),
        refreshKey: 0
      })
    );

    const scrubber = screen.getByLabelText("Scrub playback");
    act(() => {
      fireEvent.change(scrubber, { target: { value: "22000" } });
      fireEvent.mouseUp(scrubber);
    });

    await waitFor(() => {
      const [, playbackRequest] = fetchMock.mock.calls[1] ?? [];
      expect(JSON.parse(String(playbackRequest?.body))).toMatchObject({
        action: "seek",
        playbackPositionMs: 22_000
      });
    });
  });
});
