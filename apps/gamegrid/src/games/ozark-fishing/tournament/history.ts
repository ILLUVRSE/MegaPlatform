import type { TournamentHistoryEntry } from './types';

const STORAGE_KEY = 'gamegrid.ozark-fishing.tournaments.v1';
const MAX_HISTORY = 10;

export function loadTournamentHistory(): TournamentHistoryEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TournamentHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => !!entry && typeof entry.id === 'string').slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function saveTournamentHistory(entries: TournamentHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  const bounded = entries.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
}

export function pushTournamentHistory(entry: TournamentHistoryEntry): TournamentHistoryEntry[] {
  const current = loadTournamentHistory().filter((existing) => existing.id !== entry.id);
  const next = [entry, ...current].slice(0, MAX_HISTORY);
  saveTournamentHistory(next);
  return next;
}
