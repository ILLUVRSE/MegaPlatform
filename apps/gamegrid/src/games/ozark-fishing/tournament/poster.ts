import { exportPhotoModePng } from '../photoMode';

export interface TournamentPosterInput {
  tournamentName: string;
  dateLabel: string;
  format: 'bracket' | 'league';
  matchType: 'derby' | 'big_catch';
  durationSec: number;
  roomCodeText?: string;
  standings: Array<{ playerId: string; bestFishWeight: number; rarityBadge: string }>;
}

export interface TournamentPosterResult {
  width: number;
  height: number;
  metadata: string;
  blob: Blob;
}

export function buildTournamentPosterMetadata(input: TournamentPosterInput): string {
  const top = input.standings.slice(0, 8);
  return [
    'GameGrid',
    'Ozark Fishing',
    `Tournament:${input.tournamentName}`,
    `Date:${input.dateLabel}`,
    `Format:${input.format}`,
    `Match:${input.matchType}`,
    `Duration:${input.durationSec}s`,
    `Podium:${top.slice(0, 3).map((entry) => `${entry.playerId}:${entry.bestFishWeight.toFixed(2)}:${entry.rarityBadge}`).join(',')}`,
    `Standings:${top.map((entry) => entry.playerId).join(',')}`,
    `Room:${input.roomCodeText ?? '-'}`
  ].join('|');
}

export async function renderTournamentPosterPng(input: TournamentPosterInput): Promise<TournamentPosterResult> {
  const width = 1200;
  const height = 1600;
  const metadata = buildTournamentPosterMetadata(input);
  const blob = await exportPhotoModePng({
    width,
    height,
    filter: 'none',
    title: metadata,
    overlayInfo: {
      species: input.standings[0]?.playerId ?? 'Champion',
      weightLabel: `${input.standings[0]?.bestFishWeight.toFixed(2) ?? '0.00'} lb`,
      rarity: input.standings[0]?.rarityBadge ?? 'Champion',
      spot: input.format,
      weather: input.matchType,
      dateLabel: input.dateLabel
    }
  });

  return {
    width,
    height,
    metadata,
    blob
  };
}
