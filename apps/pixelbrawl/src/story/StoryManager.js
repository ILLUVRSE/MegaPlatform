import { RosterManager } from "../engine/roster/RosterManager.js";
import { storyData } from "./storyData.js";
import { StoryKeys } from "./StoryKeys.js";

const clampTextLines = (lines) => (Array.isArray(lines) ? lines.slice(0, 3).map((line) => String(line || "").trim()).filter(Boolean) : []);

const hashString = (value) => {
  const str = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededPick = (arr, seed, salt = "") => {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  const idx = hashString(`${seed}:${salt}`) % arr.length;
  return arr[idx];
};

const toDisplayName = (id) => RosterManager.getFighterMeta(id).displayName || String(id || "").toUpperCase();

const getFighterStory = (id) => storyData.fighters[String(id || "").toLowerCase()] || null;

const panelFromEntry = (entry) => ({
  image: entry?.image || null,
  text: clampTextLines(entry?.text || [])
});

const normalizePanels = (entries) => {
  if (!Array.isArray(entries)) return [];
  return entries.map(panelFromEntry).filter((panel) => panel.text.length > 0 || panel.image);
};

const fillTemplate = (line, vars) => String(line || "").replace(/\{([A-Z0-9_]+)\}/g, (_, key) => vars[key] ?? "");

const makeTemplatePanel = (templateLines, vars, image = null) => ({
  image,
  text: clampTextLines(templateLines.map((line) => fillTemplate(line, vars)))
});

const getStageTag = (stageId, seed) => {
  const tags = storyData.stages?.[stageId]?.tagLines || [];
  return seededPick(tags, seed, "stageTag") || "";
};

const getLinePools = (fighterId) => {
  const pools = getFighterStory(fighterId)?.linePools || {};
  return {
    p1Lines: pools.p1Lines || ["I'm ready."],
    winLines: pools.winLines || ["It's over."],
    loseLines: pools.loseLines || ["Not finished yet."],
    tauntLines: pools.tauntLines || ["Try again."]
  };
};

const makeGeneratedPrefight = ({ p1Id, p2Id, stageId, seed }) => {
  const p1Pools = getLinePools(p1Id);
  const p2Pools = getLinePools(p2Id);
  const vars = {
    P1: toDisplayName(p1Id),
    P2: toDisplayName(p2Id),
    P1_LINE: seededPick(p1Pools.p1Lines, seed, "p1prefight"),
    P2_LINE: seededPick(p2Pools.tauntLines, seed, "p2taunt")
  };
  const tag = getStageTag(stageId, seed);
  const panel = makeTemplatePanel(storyData.templates.prefight || [], vars, `story_fallback_stage_${stageId}`);
  if (tag && panel.text.length < 3) panel.text.push(tag);
  return [panel];
};

const makeGeneratedPostfight = ({ p1Id, p2Id, stageId, seed, won }) => {
  const p1Pools = getLinePools(p1Id);
  const p2Pools = getLinePools(p2Id);
  const vars = {
    P1: toDisplayName(p1Id),
    P2: toDisplayName(p2Id),
    WIN_LINE: seededPick(p1Pools.winLines, seed, "winline"),
    LOSE_LINE: seededPick(p1Pools.loseLines, seed, "loseline"),
    TAUNT_LINE: seededPick(p2Pools.tauntLines, seed, "tauntline")
  };
  const template = won ? storyData.templates.postfightWin : storyData.templates.postfightLose;
  const tag = getStageTag(stageId, seed);
  const panel = makeTemplatePanel(template || [], vars, `story_fallback_stage_${stageId}`);
  if (tag && panel.text.length < 3) panel.text.push(tag);
  return [panel];
};

const resolveMatchupPanels = (p1Id, p2Id, type) => {
  const fighter = getFighterStory(p1Id);
  const matchup = fighter?.matchups?.[String(p2Id || "").toLowerCase()];
  if (!matchup?.[type]) return [];
  return normalizePanels(matchup[type]);
};

const resolveGenericPanels = (p1Id, type) => {
  const fighter = getFighterStory(p1Id);
  if (!fighter) return [];
  if (type === "intro") return normalizePanels(fighter.intro);
  if (type === StoryKeys.TYPES.PREFIGHT) return normalizePanels(fighter.genericPrefight);
  if (type === StoryKeys.TYPES.POSTFIGHT_WIN) return normalizePanels(fighter.genericPostfightWin);
  if (type === StoryKeys.TYPES.POSTFIGHT_LOSE) return normalizePanels(fighter.genericPostfightLose);
  if (type === StoryKeys.TYPES.ENDING) return normalizePanels(fighter.ending);
  return [];
};

const runSeedFrom = ({ runSeed, matchIndex, type, p1Id, p2Id }) => `${runSeed || "run"}:${matchIndex || 0}:${type}:${p1Id || "p1"}:${p2Id || "p2"}`;

export class StoryManager {
  static getArcadeSequence({ type, p1Id, p2Id, stageId, runSeed, matchIndex = 0 }) {
    const seed = runSeedFrom({ runSeed, matchIndex, type, p1Id, p2Id });

    if (type === StoryKeys.TYPES.ENDING) {
      const endingPanels = resolveGenericPanels(p1Id, StoryKeys.TYPES.ENDING);
      if (endingPanels.length > 0) {
        return { type, canSkip: true, panels: endingPanels };
      }
      return {
        type,
        canSkip: true,
        panels: [
          {
            image: `story_fallback_stage_${stageId || "neonDojo"}`,
            text: [`${toDisplayName(p1Id)} leaves with the title.`, "A new challenger waits in the dark."]
          }
        ]
      };
    }

    const matchupPanels = resolveMatchupPanels(p1Id, p2Id, type);
    if (matchupPanels.length > 0) {
      return { type, canSkip: true, panels: matchupPanels };
    }

    if (type === StoryKeys.TYPES.PREFIGHT && matchIndex === 0) {
      const introPanels = resolveGenericPanels(p1Id, "intro");
      if (introPanels.length > 0) {
        const tag = getStageTag(stageId, seed);
        const enriched = introPanels.map((panel, idx) => {
          if (!tag || idx !== introPanels.length - 1 || panel.text.length >= 3) return panel;
          return { ...panel, text: clampTextLines([...panel.text, tag]) };
        });
        return { type, canSkip: true, panels: enriched };
      }
    }

    const genericPanels = resolveGenericPanels(p1Id, type);
    if (genericPanels.length > 0) {
      const picked = seededPick(genericPanels, seed, "genericPanel");
      const tag = getStageTag(stageId, seed);
      const lines = [...picked.text];
      if (tag && lines.length < 3) lines.push(tag);
      return {
        type,
        canSkip: true,
        panels: [{ image: picked.image || `story_fallback_stage_${stageId}`, text: clampTextLines(lines) }]
      };
    }

    if (type === StoryKeys.TYPES.PREFIGHT) {
      return {
        type,
        canSkip: true,
        panels: makeGeneratedPrefight({ p1Id, p2Id, stageId, seed })
      };
    }

    return {
      type,
      canSkip: true,
      panels: makeGeneratedPostfight({ p1Id, p2Id, stageId, seed, won: type === StoryKeys.TYPES.POSTFIGHT_WIN })
    };
  }
}
