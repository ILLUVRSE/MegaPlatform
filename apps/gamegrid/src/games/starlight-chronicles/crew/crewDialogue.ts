import dialogueRaw from '../../../content/starlight-chronicles/dialogue.json';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId, StarlightProfile } from '../rules';
import type { CrewMember, CrewRole } from './crewTypes';

export type DialogueSituation = 'story' | 'explore' | 'combat' | 'shop' | 'boss';

interface DialogueFile {
  captain: Partial<Record<DialogueSituation, string[]>>;
  science: Partial<Record<DialogueSituation, string[]>>;
  engineer: Partial<Record<DialogueSituation, string[]>>;
  tactical: Partial<Record<DialogueSituation, string[]>>;
  factionBias: Record<FactionId, string[]>;
  traitBias: Record<string, string[]>;
}

export interface DialogueContext {
  runSeed: number;
  nodeId: string;
  nodeLabel: string;
  situation: DialogueSituation;
  factionBias: FactionId;
  captainName: string;
  activeCrew: CrewMember[];
  focus: 'diplomacy' | 'profit' | 'wonder';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function loadCrewDialogue(): DialogueFile {
  const parsed = dialogueRaw as unknown;
  if (!isRecord(parsed)) {
    throw new Error('starlight dialogue json invalid');
  }

  const roles: CrewRole[] = ['captain', 'science', 'engineer', 'tactical'];
  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i];
    if (!isRecord(parsed[role])) {
      throw new Error('starlight dialogue role bucket invalid');
    }
  }

  if (!isRecord(parsed.factionBias) || !isStringArray(parsed.factionBias.concordium) || !isStringArray(parsed.factionBias.freebelt) || !isStringArray(parsed.factionBias.astral)) {
    throw new Error('starlight dialogue faction bucket invalid');
  }

  if (!isRecord(parsed.traitBias)) {
    throw new Error('starlight dialogue trait bucket invalid');
  }

  return parsed as unknown as DialogueFile;
}

function substitute(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{([A-Z_]+)\}/g, (_full, key: string) => replacements[key] ?? `{${key}}`);
}

function strongestFaction(profile: StarlightProfile): FactionId {
  const entries: Array<{ id: FactionId; value: number }> = [
    { id: 'concordium', value: profile.factions.concordium },
    { id: 'freebelt', value: profile.factions.freebelt },
    { id: 'astral', value: profile.factions.astral }
  ];
  entries.sort((a, b) => b.value - a.value);
  return entries[0].id;
}

export function resolveDialogueContext(profile: StarlightProfile, runSeed: number, nodeId: string, nodeLabel: string, situation: DialogueSituation, focus: DialogueContext['focus']): DialogueContext {
  const activeCrewIds = new Set(Object.values(profile.crew.active).filter((entry): entry is string => Boolean(entry)));
  const activeCrew = profile.crew.roster.filter((member) => activeCrewIds.has(member.id));
  const captain = activeCrew.find((member) => member.role === 'captain') ?? profile.crew.roster.find((member) => member.role === 'captain');

  return {
    runSeed,
    nodeId,
    nodeLabel,
    situation,
    factionBias: strongestFaction(profile),
    captainName: captain?.name ?? 'Captain',
    activeCrew,
    focus
  };
}

export function selectCrewDialogue(context: DialogueContext, dialogue = loadCrewDialogue()): string {
  const seed = (context.runSeed ^ hashStringToSeed(`${context.nodeId}:${context.situation}:${context.focus}`)) >>> 0;
  const rng = createSeededRng(seed);

  const lines: string[] = [];
  const roleLookup: Record<CrewRole, Partial<Record<DialogueSituation, string[]>>> = {
    captain: dialogue.captain,
    science: dialogue.science,
    engineer: dialogue.engineer,
    tactical: dialogue.tactical
  };

  for (let i = 0; i < context.activeCrew.length; i += 1) {
    const member = context.activeCrew[i];
    const bucket = roleLookup[member.role]?.[context.situation] ?? [];
    if (bucket.length > 0) {
      lines.push(bucket[rng.nextInt(0, bucket.length - 1)] ?? bucket[0]);
    }
  }

  const factionLines = dialogue.factionBias[context.factionBias] ?? [];
  if (factionLines.length > 0) {
    lines.push(factionLines[rng.nextInt(0, factionLines.length - 1)] ?? factionLines[0]);
  }

  const traitPool = context.activeCrew.flatMap((member) => member.traits).filter((trait) => dialogue.traitBias[trait]?.length);
  if (traitPool.length > 0) {
    const trait = traitPool[rng.nextInt(0, traitPool.length - 1)] ?? traitPool[0];
    const traitLines = dialogue.traitBias[trait] ?? [];
    if (traitLines.length > 0) {
      lines.push(traitLines[rng.nextInt(0, traitLines.length - 1)] ?? traitLines[0]);
    }
  }

  const selected = lines.length > 0 ? (lines[rng.nextInt(0, lines.length - 1)] ?? lines[0]) : '{CAPTAIN}: Standing by.';
  return substitute(selected, {
    CAPTAIN: context.captainName,
    FACTION: context.factionBias,
    NODE: context.nodeLabel
  });
}

export function formatDialogueTemplate(template: string, placeholders: Record<string, string>): string {
  return substitute(template, placeholders);
}
