import { RosterManager } from "../engine/roster/RosterManager.js";
import { StageManager } from "../stages/StageManager.js";

const DIFF_ORDER = ["easy", "medium", "hard"];

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickDifficulty = (base, idx) => {
  const baseIdx = Math.max(0, DIFF_ORDER.indexOf(base));
  const bump = Math.floor(idx / 2);
  return DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, baseIdx + bump)];
};

export const ArcadeLadder = {
  create({ p1Id, baseDifficulty = "medium", length = 8 }) {
    const enabled = RosterManager.getEnabledFighters();
    const roster = enabled.length > 0 ? enabled : RosterManager.getAllSlots().map((s) => s.id);
    const stageIds = StageManager.getAllStages().map((s) => s.id);
    const stageOrder = shuffle(stageIds);

    const ladder = [];
    let lastOpponent = null;

    for (let i = 0; i < length; i += 1) {
      let opponent = null;
      let attempts = 0;
      while (!opponent && attempts < 20) {
        const candidate = roster[Math.floor(Math.random() * roster.length)];
        if (candidate === p1Id) {
          attempts += 1;
          continue;
        }
        if (candidate === lastOpponent) {
          attempts += 1;
          continue;
        }
        opponent = candidate;
      }
      if (!opponent) opponent = roster.find((id) => id !== p1Id) || roster[0];
      lastOpponent = opponent;

      const stageId = stageOrder[i % stageOrder.length];
      const aiDifficulty = pickDifficulty(baseDifficulty, i);

      ladder.push({
        index: i,
        opponentId: opponent,
        stageId,
        aiDifficulty
      });
    }

    return ladder;
  }
};
