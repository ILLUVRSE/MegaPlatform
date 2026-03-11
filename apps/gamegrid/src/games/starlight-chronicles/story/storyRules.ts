import chaptersRaw from '../../../content/starlight-chronicles/chapters.json';
import type { CodexEntry, FactionId, OutcomeDelta, StarlightProfile } from '../rules';
import { applyOutcome } from '../rules';

export interface FactionRequirement {
  faction: FactionId;
  min: number;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextNodeId: string | null;
  outcome: OutcomeDelta;
  requiresFaction?: FactionRequirement;
}

export interface StoryNode {
  id: string;
  text: string;
  choices: StoryChoice[];
}

export interface Chapter {
  id: string;
  title: string;
  startNodeId: string;
  nodes: StoryNode[];
}

interface ChaptersFile {
  chapters: Chapter[];
}

function asRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isFactionRequirement(value: unknown): value is FactionRequirement {
  if (!asRecord(value)) return false;
  return (value.faction === 'concordium' || value.faction === 'freebelt' || value.faction === 'astral') && typeof value.min === 'number';
}

function isChoice(value: unknown): value is StoryChoice {
  if (!asRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (typeof value.nextNodeId === 'string' || value.nextNodeId === null) &&
    asRecord(value.outcome) &&
    (value.requiresFaction === undefined || isFactionRequirement(value.requiresFaction))
  );
}

function isNode(value: unknown): value is StoryNode {
  if (!asRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.text === 'string' && Array.isArray(value.choices) && value.choices.every(isChoice);
}

function isChapter(value: unknown): value is Chapter {
  if (!asRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.startNodeId === 'string' &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isNode)
  );
}

export function loadChapters(): Chapter[] {
  const parsed = chaptersRaw as unknown as ChaptersFile;
  if (!parsed || !Array.isArray(parsed.chapters) || !parsed.chapters.every(isChapter)) {
    throw new Error('starlight chapters json invalid');
  }
  return parsed.chapters;
}

export function findChapter(chapters: Chapter[], chapterId: string): Chapter {
  const chapter = chapters.find((entry) => entry.id === chapterId);
  if (!chapter) throw new Error(`missing chapter: ${chapterId}`);
  return chapter;
}

export function findNode(chapter: Chapter, nodeId: string): StoryNode {
  const node = chapter.nodes.find((entry) => entry.id === nodeId);
  if (!node) throw new Error(`missing node: ${nodeId}`);
  return node;
}

export function resolveAvailableChoices(profile: StarlightProfile, node: StoryNode): StoryChoice[] {
  return node.choices.filter((choice) => {
    if (!choice.requiresFaction) return true;
    return profile.factions[choice.requiresFaction.faction] >= choice.requiresFaction.min;
  });
}

export function resolveChoicesWithCrewBonus(
  profile: StarlightProfile,
  node: StoryNode,
  canPersuade: boolean,
  persuadeOutcome: OutcomeDelta
): StoryChoice[] {
  const base = resolveAvailableChoices(profile, node);
  if (!canPersuade || base.some((entry) => entry.id === 'crew-persuade')) {
    return base;
  }
  return [
    ...base,
    {
      id: 'crew-persuade',
      label: 'Persuade (Crew Bonus)',
      nextNodeId: base[0]?.nextNodeId ?? null,
      outcome: persuadeOutcome
    }
  ];
}

export interface StoryChoiceResult {
  profile: StarlightProfile;
  nextNodeId: string | null;
  logEntry: CodexEntry;
}

export function applyStoryChoice(profile: StarlightProfile, chapter: Chapter, nodeId: string, choiceId: string): StoryChoiceResult {
  const node = findNode(chapter, nodeId);
  const available = resolveAvailableChoices(profile, node);
  const choice = available.find((entry) => entry.id === choiceId);
  if (!choice) {
    throw new Error(`invalid choice ${choiceId} for node ${nodeId}`);
  }

  const withOutcome = applyOutcome(profile, choice.outcome);
  const logEntry: CodexEntry = {
    chapterId: chapter.id,
    nodeId,
    choiceId: choice.id,
    label: choice.label,
    timestamp: Date.now()
  };

  const nextProfile: StarlightProfile = {
    ...withOutcome,
    codexLog: [...withOutcome.codexLog, logEntry],
    chapterProgress: {
      ...withOutcome.chapterProgress,
      [chapter.id]: choice.nextNodeId ?? nodeId
    }
  };

  return {
    profile: nextProfile,
    nextNodeId: choice.nextNodeId,
    logEntry
  };
}
