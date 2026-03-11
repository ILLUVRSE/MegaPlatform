/**
 * Unit tests for agent-manager render helpers.
 * Request/response: validates meme output size and ffmpeg wrapper.
 * Guard: mocks child_process for ffmpeg calls.
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    spawn: vi.fn(() => {
      const handlers: Record<string, (code?: number) => void> = {};
      return {
        on: (event: string, cb: (code?: number) => void) => {
          handlers[event] = cb;
          if (event === "exit") {
            setTimeout(() => cb(0), 0);
          }
        }
      };
    })
  };
});

import {
  buildSlideshowFilter,
  escapeDrawtext,
  generateMemePng,
  runFfmpeg,
  wrapText
} from "@illuvrse/agent-manager/src/render";

describe("agent render helpers", () => {
  it("renders a meme png at 800x800", async () => {
    const base = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 20, g: 20, b: 20 }
      }
    })
      .png()
      .toBuffer();

    const output = await generateMemePng(base, "Test caption");
    const meta = await sharp(output).metadata();

    expect(meta.width).toBe(800);
    expect(meta.height).toBe(800);
  });

  it("resolves when ffmpeg exits successfully", async () => {
    await expect(runFfmpeg(["-version"])).resolves.toBeUndefined();
  });

  it("escapes unsafe drawtext characters", () => {
    const escaped = escapeDrawtext("Hello: 'world' 100% \\ test");
    expect(escaped).toContain("\\:");
    expect(escaped).toContain("\\'");
    expect(escaped).toContain("\\%");
    expect(escaped).toContain("\\\\");
  });

  it("wraps text into multiple lines", () => {
    const wrapped = wrapText("This is a long line that should wrap", 10);
    expect(wrapped.split("\n").length).toBeGreaterThan(1);
  });

  it("builds slideshow filter with style-specific drawtext", () => {
    const { filter } = buildSlideshowFilter(
      [
        { text: "Scene one text", durationMs: 2000 },
        { text: "Scene two text", durationMs: 2000 }
      ],
      "impact"
    );
    expect(filter).toContain("drawtext");
    expect(filter).toContain("borderw=4");
    expect(filter).toContain("xfade");
  });
});
