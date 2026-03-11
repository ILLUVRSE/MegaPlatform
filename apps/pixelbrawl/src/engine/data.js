export const WIDTH = 960;
export const HEIGHT = 540;
export const LANES = ["front", "mid", "back"];
export const LANE_Y = { front: 372, mid: 328, back: 280 };

export const MOVESETS = {
  jab: { name: "jab", startup: 7, active: 3, recovery: 11, damage: 7, hitLevel: "high", range: 70, hitstun: 11, blockstun: 8, type: "strike", attackType: "hit" },
  kick: { name: "kick", startup: 10, active: 4, recovery: 15, damage: 10, hitLevel: "mid", range: 88, hitstun: 14, blockstun: 9, type: "kick", unsafe: true, attackType: "kick" },
  string2: { name: "string2", startup: 9, active: 3, recovery: 14, damage: 9, hitLevel: "mid", range: 76, hitstun: 12, blockstun: 9, type: "strike", attackType: "hit" },
  low: { name: "low", startup: 10, active: 4, recovery: 12, damage: 8, hitLevel: "low", range: 75, hitstun: 10, blockstun: 8, type: "strike", attackType: "hit" },
  heavy: { name: "heavy", startup: 13, active: 4, recovery: 16, damage: 12, hitLevel: "mid", range: 82, hitstun: 14, blockstun: 10, type: "strike", attackType: "power" },
  launcher: { name: "launcher", startup: 15, active: 3, recovery: 19, damage: 11, hitLevel: "mid", range: 90, hitstun: 16, blockstun: 10, type: "launcher", unsafe: true, attackType: "power" },
  sweep: { name: "sweep", startup: 17, active: 4, recovery: 24, damage: 14, hitLevel: "low", range: 88, hitstun: 17, blockstun: 8, type: "knockdown", unsafe: true, attackType: "power" },
  sidestepStrike: { name: "sidestepStrike", startup: 11, active: 4, recovery: 14, damage: 10, hitLevel: "mid", range: 76, hitstun: 12, blockstun: 10, type: "strike", tracking: true, attackType: "power" },
  jumpIn: { name: "jumpIn", startup: 12, active: 5, recovery: 15, damage: 9, hitLevel: "high", range: 72, hitstun: 11, blockstun: 8, type: "strike", attackType: "hit" },
  throw: { name: "throw", startup: 6, active: 2, recovery: 16, damage: 16, hitLevel: "throw", range: 54, hitstun: 20, blockstun: 0, type: "throw", attackType: "power" }
};

export const FIGHTERS = [
  { id: "BYTE", hp: 102, walk: 1.04, sidestep: 1.04, damage: 1, throw: 1, launcherRecovery: 1, sweepRecovery: 1, color: "#44ecff", accent: "#f1fbff" },
  { id: "GLITCH", hp: 98, walk: 1.02, sidestep: 1.12, damage: 1, throw: 1, launcherRecovery: 1, sweepRecovery: 1, color: "#8f6aff", accent: "#f6e8ff" },
  { id: "BRICK", hp: 122, walk: 0.82, sidestep: 0.85, damage: 1.08, throw: 1.25, launcherRecovery: 1.1, sweepRecovery: 1.1, color: "#f5aa42", accent: "#fff2d8" },
  { id: "ZIP", hp: 90, walk: 1.25, sidestep: 1.2, damage: 0.88, throw: 0.9, launcherRecovery: 0.9, sweepRecovery: 0.9, color: "#81f569", accent: "#eafff1" },
  { id: "ECHO", hp: 100, walk: 1, sidestep: 1, damage: 0.98, throw: 1, launcherRecovery: 1, sweepRecovery: 1, color: "#70d5ff", accent: "#f6fdff" },
  { id: "VEX", hp: 104, walk: 1, sidestep: 1, damage: 1, throw: 1, launcherRecovery: 0.92, sweepRecovery: 1, color: "#ff7070", accent: "#fff2f2" },
  { id: "SPARK", hp: 100, walk: 0.97, sidestep: 0.98, damage: 1.08, throw: 1, launcherRecovery: 1, sweepRecovery: 1, color: "#ffe54d", accent: "#fffce0" },
  { id: "SHADE", hp: 96, walk: 1.04, sidestep: 1.17, damage: 0.98, throw: 1, launcherRecovery: 1, sweepRecovery: 1, color: "#8aa0ff", accent: "#f1f4ff" },
  { id: "IRON", hp: 115, walk: 0.88, sidestep: 0.9, damage: 1.05, throw: 1.05, launcherRecovery: 1, sweepRecovery: 1.06, color: "#b4b4be", accent: "#fafaff" },
  { id: "FLAIR", hp: 95, walk: 1.03, sidestep: 1.03, damage: 0.97, throw: 1, launcherRecovery: 0.98, sweepRecovery: 1, color: "#ff7dbd", accent: "#fff0f8" },
  { id: "RIFT", hp: 92, walk: 1, sidestep: 1.3, damage: 1, throw: 1, launcherRecovery: 1.05, sweepRecovery: 1.05, color: "#74fff6", accent: "#eaffff" },
  { id: "NOVA", hp: 84, walk: 1.1, sidestep: 1.05, damage: 1.22, throw: 1, launcherRecovery: 1, sweepRecovery: 1.08, color: "#ff6b4a", accent: "#ffece7" }
];

export const DIFFICULTY = {
  easy: { reactionMs: 420, blockRate: 0.22, sidestepRate: 0.08, punishRate: 0.08 },
  medium: { reactionMs: 300, blockRate: 0.43, sidestepRate: 0.2, punishRate: 0.3 },
  hard: { reactionMs: 190, blockRate: 0.62, sidestepRate: 0.34, punishRate: 0.5 }
};

export const AI_PERSONALITY = ["aggressive", "defensive", "trickster"];
