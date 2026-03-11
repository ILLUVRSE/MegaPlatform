import type { ProgressionState, RarityTier } from './types';
import type { FightReplay } from './replay';

export type HighlightType = 'biggest_fish' | 'rarest_fish' | 'dramatic_fight';

export interface SessionHighlight {
  id: string;
  createdAt: number;
  type: HighlightType;
  title: string;
  fishId: string;
  fishName: string;
  weightLb: number;
  rarityTier: RarityTier;
  replayId?: string;
  value: number;
}

const MAX_HIGHLIGHTS = 120;

function rarityRank(rarity: RarityTier): number {
  if (rarity === 'Legendary') return 4;
  if (rarity === 'Rare') return 3;
  if (rarity === 'Uncommon') return 2;
  return 1;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function detectSessionHighlights(
  catches: Array<{ fishId: string; fishName: string; weightLb: number; rarityTier: RarityTier }>,
  replays: FightReplay[]
): SessionHighlight[] {
  if (catches.length === 0) return [];

  let biggest = catches[0];
  for (let i = 1; i < catches.length; i += 1) {
    if (catches[i].weightLb > biggest.weightLb) biggest = catches[i];
  }

  let rarest = catches[0];
  for (let i = 1; i < catches.length; i += 1) {
    const a = catches[i];
    if (rarityRank(a.rarityTier) > rarityRank(rarest.rarityTier) || (rarityRank(a.rarityTier) === rarityRank(rarest.rarityTier) && a.weightLb > rarest.weightLb)) {
      rarest = a;
    }
  }

  let dramaticReplay: FightReplay | null = null;
  for (let i = 0; i < replays.length; i += 1) {
    const replay = replays[i];
    if (!dramaticReplay || replay.maxTension > dramaticReplay.maxTension) dramaticReplay = replay;
  }

  const highlights: SessionHighlight[] = [
    {
      id: uid('hl-big'),
      createdAt: Date.now(),
      type: 'biggest_fish',
      title: 'Biggest Fish',
      fishId: biggest.fishId,
      fishName: biggest.fishName,
      weightLb: biggest.weightLb,
      rarityTier: biggest.rarityTier,
      value: biggest.weightLb
    },
    {
      id: uid('hl-rare'),
      createdAt: Date.now(),
      type: 'rarest_fish',
      title: 'Rarest Fish',
      fishId: rarest.fishId,
      fishName: rarest.fishName,
      weightLb: rarest.weightLb,
      rarityTier: rarest.rarityTier,
      value: rarityRank(rarest.rarityTier)
    }
  ];

  if (dramaticReplay) {
    highlights.push({
      id: uid('hl-dramatic'),
      createdAt: Date.now(),
      type: 'dramatic_fight',
      title: 'Most Dramatic Fight',
      fishId: dramaticReplay.fishId,
      fishName: dramaticReplay.fishName,
      weightLb: dramaticReplay.weightLb,
      rarityTier: dramaticReplay.rarityTier,
      replayId: dramaticReplay.id,
      value: dramaticReplay.maxTension
    });
  }

  return highlights;
}

export function addHighlightsToProgression(state: ProgressionState, highlights: SessionHighlight[]): ProgressionState {
  if (highlights.length === 0) return state;
  const merged = [...state.highlights, ...highlights];
  const bounded = merged.length > MAX_HIGHLIGHTS ? merged.slice(merged.length - MAX_HIGHLIGHTS) : merged;
  return {
    ...state,
    highlights: bounded
  };
}
