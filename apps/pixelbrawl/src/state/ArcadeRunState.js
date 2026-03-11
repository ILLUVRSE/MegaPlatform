import { ArcadeLadder } from "../modes/ArcadeLadder.js";

export const ArcadeRunState = {
  create({ p1Id, baseDifficulty = "medium", length = 8 }) {
    const ladder = ArcadeLadder.create({ p1Id, baseDifficulty, length });
    const runSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${p1Id}`;
    return {
      currentMatchIndex: 0,
      runStartMs: Date.now(),
      runSeed,
      matchStartMs: 0,
      totalDamageTaken: 0,
      totalDamageDealt: 0,
      perfectBlocks: 0,
      kos: 0,
      wins: 0,
      losses: 0,
      selectedP1FighterId: p1Id,
      ladder,
      baseDifficulty
    };
  }
};
