import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  },
  userGame: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  userGameVersion: {
    create: vi.fn()
  },
  $transaction: vi.fn(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock))
}));

const getServerSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@illuvrse/db", () => ({
  prisma: prismaMock
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

import { POST as createGame } from "@/app/api/gamegrid/games/route";
import { POST as publishGame } from "@/app/api/gamegrid/games/[id]/publish/route";

describe("gamegrid api", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerSessionMock.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock));
  });

  it("creates a draft game", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.userGame.create.mockResolvedValue({ id: "game-1", status: "DRAFT", specJson: {} });

    const request = new Request("http://localhost/api/gamegrid/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-key": "owner-1"
      },
      body: JSON.stringify({
        title: "Grid Test",
        templateId: "BREAKOUT_MICRO",
        specDraft: {
          id: "BREAKOUT_MICRO-seed-1",
          seed: "seed-1",
          templateId: "BREAKOUT_MICRO",
          title: "Grid Test",
          tagline: "Break all bricks",
          instructions: "Move paddle and clear bricks.",
          durationSeconds: 30,
          inputSchema: { keys: ["ArrowLeft", "ArrowRight"], mouse: { enabled: true } },
          winCondition: { type: "bricks", target: 10 },
          loseCondition: { type: "misses", maxMisses: 3 },
          scoring: { mode: "winlose" },
          theme: { palette: "neon-burst", bgStyle: "grid-glow", sfxStyle: "synth", particles: "spark" },
          params: { bricksToClear: 10, paddleWidth: 140, ballSpeed: 240, maxMisses: 3 },
          modifiers: []
        }
      })
    });

    const response = await createGame(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.game.id).toBe("game-1");
  });

  it("rejects publish with invalid specs", async () => {
    prismaMock.userGame.findUnique.mockResolvedValue({
      id: "game-2",
      ownerId: null,
      ownerKey: "owner-1",
      status: "DRAFT",
      specJson: {
        id: "bad-spec",
        seed: "bad-seed",
        templateId: "UNKNOWN_TEMPLATE",
        title: "Bad",
        tagline: "Bad",
        instructions: "Bad",
        durationSeconds: 12,
        inputSchema: { keys: [], mouse: { enabled: true } },
        winCondition: { type: "targets", target: 20 },
        loseCondition: { type: "timer" },
        scoring: { mode: "winlose" },
        theme: { palette: "neon-burst", bgStyle: "grid-glow", sfxStyle: "synth", particles: "spark" },
        params: { targetCount: 20, targetSize: 20, spawnInterval: 0.4, missPenaltySeconds: 1 },
        modifiers: []
      }
    });

    const request = new Request("http://localhost/api/gamegrid/games/game-2/publish", {
      method: "POST",
      headers: { "x-owner-key": "owner-1" }
    });

    const response = await publishGame(request, { params: Promise.resolve({ id: "game-2" }) });

    expect(response.status).toBe(400);
    expect(prismaMock.userGame.update).not.toHaveBeenCalled();
  });
});
