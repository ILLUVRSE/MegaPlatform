import { describe, expect, it } from "vitest";
import { buildDraftShotTemplatesForScene } from "@/lib/showShotlistSuggestions";

describe("show shotlist suggestions", () => {
  it("derives deterministic draft templates from scene text and tags", () => {
    const scene = {
      id: "scene_1",
      showEpisodeId: "episode_1",
      sceneNumber: 1,
      title: "Opening confrontation",
      scriptText:
        "A crowded hallway erupts into a fast argument while two rivals push through the frame and the crowd reacts around them.",
      startIntentSeconds: null,
      endIntentSeconds: null,
      tags: ["action", "dialogue"],
      createdAt: new Date("2026-03-13T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z")
    };

    expect(buildDraftShotTemplatesForScene(scene)).toEqual([
      {
        shotNumber: 1,
        title: "Establish scene geography",
        framing: "Wide",
        cameraMotion: "Static",
        lens: "24mm",
        durationSeconds: 6,
        rationale: "Anchor the audience in location, blocking, and scene tone."
      },
      {
        shotNumber: 2,
        title: "Primary dialogue coverage",
        framing: "Medium two-shot",
        cameraMotion: "Locked-off",
        lens: "50mm",
        durationSeconds: 4,
        rationale: "Hold readable eyelines and coverage for the scene's spoken beat."
      },
      {
        shotNumber: 3,
        title: "Cover the main beat",
        framing: "Medium",
        cameraMotion: "Slow push",
        lens: "50mm",
        durationSeconds: 5,
        rationale: "Capture the core performance or story turn in readable coverage."
      }
    ]);
  });
});
