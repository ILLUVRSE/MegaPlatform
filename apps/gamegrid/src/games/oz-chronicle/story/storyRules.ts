import chaptersRaw from '../../../content/oz-chronicle/chapters.json';
import { applyStoryOutcome, type CompanionId, type OzChronicleState, type StoryOutcome } from '../rules';

export interface CompanionMeterRequirement {
  companionId: CompanionId;
  minMeter: number;
}

export interface StoryChoiceBonus {
  companionId: CompanionId;
  minMeter: number;
  outcome: StoryOutcome;
  tag: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextNodeId: string | null;
  outcome: StoryOutcome;
  requiresCompanionMeter?: CompanionMeterRequirement;
  requiresGoldenCapUses?: number;
  companionBonus?: StoryChoiceBonus;
  companionBonusTag?: string;
}

export interface StoryNode {
  id: string;
  text: string;
  choices: StoryChoice[];
}

export interface StoryChapter {
  id: string;
  title: string;
  startNodeId: string;
  nodes: StoryNode[];
}

interface ChaptersFile {
  chapters: StoryChapter[];
}

function asRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isStoryOutcome(value: unknown): value is StoryOutcome {
  if (!asRecord(value)) return false;
  return true;
}

function isRequirement(value: unknown): value is CompanionMeterRequirement {
  if (!asRecord(value)) return false;
  return typeof value.companionId === 'string' && typeof value.minMeter === 'number';
}

function isStoryChoiceBonus(value: unknown): value is StoryChoiceBonus {
  if (!asRecord(value)) return false;
  return (
    typeof value.companionId === 'string' &&
    typeof value.minMeter === 'number' &&
    isStoryOutcome(value.outcome) &&
    typeof value.tag === 'string'
  );
}

function isStoryChoice(value: unknown): value is StoryChoice {
  if (!asRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (typeof value.nextNodeId === 'string' || value.nextNodeId === null) &&
    isStoryOutcome(value.outcome) &&
    (value.requiresCompanionMeter === undefined || isRequirement(value.requiresCompanionMeter)) &&
    (value.requiresGoldenCapUses === undefined || typeof value.requiresGoldenCapUses === 'number') &&
    (value.companionBonus === undefined || isStoryChoiceBonus(value.companionBonus)) &&
    (value.companionBonusTag === undefined || typeof value.companionBonusTag === 'string')
  );
}

function isStoryNode(value: unknown): value is StoryNode {
  if (!asRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.text === 'string' && Array.isArray(value.choices) && value.choices.every(isStoryChoice);
}

function isStoryChapter(value: unknown): value is StoryChapter {
  if (!asRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.startNodeId === 'string' &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isStoryNode)
  );
}

export function loadChapters(): StoryChapter[] {
  const parsed = chaptersRaw as unknown as ChaptersFile;
  if (!parsed || !Array.isArray(parsed.chapters) || !parsed.chapters.every(isStoryChapter)) {
    throw new Error('oz-chronicle chapters json invalid');
  }
  return parsed.chapters;
}

export function findChapter(chapters: StoryChapter[], chapterId: string): StoryChapter {
  const chapter = chapters.find((entry) => entry.id === chapterId);
  if (!chapter) throw new Error(`missing chapter ${chapterId}`);
  return chapter;
}

export function findNode(chapter: StoryChapter, nodeId: string): StoryNode {
  const node = chapter.nodes.find((entry) => entry.id === nodeId);
  if (!node) throw new Error(`missing node ${nodeId}`);
  return node;
}

export function isChoiceUnlocked(state: OzChronicleState, choice: StoryChoice): boolean {
  const companionPass = !choice.requiresCompanionMeter
    ? true
    : (() => {
        const companion = state.companions[choice.requiresCompanionMeter.companionId];
        return companion.acquired && companion.meter >= choice.requiresCompanionMeter.minMeter;
      })();

  const capPass = choice.requiresGoldenCapUses === undefined
    ? true
    : state.goldenCap.acquired && state.goldenCap.usesRemaining >= Math.max(0, Math.round(choice.requiresGoldenCapUses));

  return companionPass && capPass;
}

export function applyStoryChoice(
  state: OzChronicleState,
  chapter: StoryChapter,
  nodeId: string,
  choiceId: string
): { state: OzChronicleState; nextNodeId: string | null; companionBonusTag?: string } {
  const node = findNode(chapter, nodeId);
  const choice = node.choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    throw new Error(`invalid choice ${choiceId}`);
  }

  if (!isChoiceUnlocked(state, choice)) {
    throw new Error(`locked choice ${choiceId}`);
  }

  let nextState = applyStoryOutcome(state, choice.outcome);
  let companionBonusTag: string | undefined;

  if (choice.companionBonus) {
    const companion = nextState.companions[choice.companionBonus.companionId];
    if (companion.acquired && companion.meter >= choice.companionBonus.minMeter) {
      nextState = applyStoryOutcome(nextState, choice.companionBonus.outcome);
      companionBonusTag = choice.companionBonus.tag;
    }
  }

  if (!companionBonusTag && choice.companionBonusTag) {
    companionBonusTag = choice.companionBonusTag;
  }

  return {
    state: nextState,
    nextNodeId: choice.nextNodeId,
    companionBonusTag
  };
}
