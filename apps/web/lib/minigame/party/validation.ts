import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().min(2).max(32)
});

export const joinRoomSchema = z.object({
  playerName: z.string().min(2).max(32)
});

export const readySchema = z.object({
  ready: z.boolean()
});

export const inputSchema = z.object({
  playerId: z.string().min(6),
  t: z.number().int().nonnegative(),
  input: z.object({
    keysDown: z.record(z.boolean()),
    keysPressed: z.record(z.boolean()),
    mouse: z.object({
      x: z.number(),
      y: z.number(),
      down: z.boolean(),
      clicked: z.boolean()
    })
  })
});

export const hostActionSchema = z.object({
  playerId: z.string().min(6),
  forceStart: z.boolean().optional()
});

export const roleSchema = z.object({
  role: z.enum(["player", "spectator"])
});

export const leaveSchema = z.object({
  playerId: z.string().min(6)
});
