import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";

const prismaMock = vi.hoisted(() => ({
  profile: {
    findFirst: vi.fn()
  },
  episode: {
    findUnique: vi.fn()
  },
  myListItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  },
  watchProgress: {
    upsert: vi.fn(),
    deleteMany: vi.fn()
  }
}));

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

import { POST as toggleMyList } from "@/app/api/watch/my-list/toggle/route";
import { POST as progressPost } from "@/app/api/watch/progress/route";

describe("watch personalization helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.episode.findUnique.mockResolvedValue({
      id: "ep-1",
      lengthSeconds: 120,
      season: {
        show: {
          isPremium: false,
          maturityRating: null
        }
      }
    });
  });

  it("parses profile cookie", () => {
    expect(getProfileIdFromCookie("ILLUVRSE_PROFILE_ID=abc123; other=1")).toBe("abc123");
  });

  it("toggles my list", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.profile.findFirst.mockResolvedValue({ id: "profile-1", userId: "user-1" });
    prismaMock.myListItem.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: "ILLUVRSE_PROFILE_ID=profile-1" },
      body: JSON.stringify({ mediaType: "SHOW", showId: "show-1" })
    });

    const response = await toggleMyList(request);
    expect(response.status).toBe(200);
    expect(prismaMock.myListItem.create).toHaveBeenCalled();
  });

  it("removes existing my list item", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.profile.findFirst.mockResolvedValue({ id: "profile-1", userId: "user-1" });
    prismaMock.myListItem.findFirst.mockResolvedValue({
      id: "list-1",
      profileId: "profile-1",
      mediaType: "SHOW",
      showId: "show-1"
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: "ILLUVRSE_PROFILE_ID=profile-1" },
      body: JSON.stringify({ mediaType: "SHOW", showId: "show-1" })
    });

    const response = await toggleMyList(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { saved: boolean };
    expect(payload.saved).toBe(false);
    expect(prismaMock.myListItem.delete).toHaveBeenCalledWith({ where: { id: "list-1" } });
  });

  it("upserts progress", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.profile.findFirst.mockResolvedValue({ id: "profile-1", userId: "user-1" });
    prismaMock.watchProgress.upsert.mockResolvedValue({ id: "progress-1", positionSec: 12, durationSec: 120 });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: "ILLUVRSE_PROFILE_ID=profile-1" },
      body: JSON.stringify({ episodeId: "ep-1", positionSec: 12, durationSec: 120 })
    });

    const response = await progressPost(request);
    expect(response.status).toBe(200);
    expect(prismaMock.watchProgress.upsert).toHaveBeenCalled();
    const payload = (await response.json()) as { progress: { positionSec: number } };
    expect(payload.progress.positionSec).toBe(12);
  });

  it("clears near-complete progress entries", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1", role: "user" } });
    prismaMock.profile.findFirst.mockResolvedValue({ id: "profile-1", userId: "user-1", isKids: false });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: "ILLUVRSE_PROFILE_ID=profile-1" },
      body: JSON.stringify({ episodeId: "ep-1", positionSec: 119, durationSec: 120 })
    });

    const response = await progressPost(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { completed: boolean; progress: null };
    expect(payload.completed).toBe(true);
    expect(prismaMock.watchProgress.deleteMany).toHaveBeenCalled();
    expect(prismaMock.watchProgress.upsert).not.toHaveBeenCalled();
  });
});
