import { describe, expect, it } from "vitest";
import { isHlsSource } from "@/components/VideoPlayer";

describe("VideoPlayer", () => {
  it("detects HLS sources", () => {
    expect(isHlsSource("https://example.com/stream.m3u8")).toBe(true);
    expect(isHlsSource("https://example.com/video.mp4")).toBe(false);
  });
});
