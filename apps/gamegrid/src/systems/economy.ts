import type { PortalStats } from '../types';

type EventRecord = Readonly<Record<string, unknown>>;

const WIN_COINS = 50;
const LOSS_COINS = 20;

function inferWin(event: EventRecord): boolean {
  const winner = event.winner;
  if (winner === 'player' || winner === 'home' || winner === 'p1' || winner === 'team-a') return true;
  const outcome = event.outcome;
  if (typeof outcome === 'string') {
    const normalized = outcome.toLowerCase();
    return normalized.includes('win') || normalized.includes('victory');
  }
  return false;
}

export function applyMatchRewards(stats: PortalStats, event: EventRecord): { next: PortalStats; ticketsEarned: number } {
  const win = inferWin(event);
  const ticketsEarned = win ? WIN_COINS : LOSS_COINS;
  const next = {
    ...stats,
    currency: {
      ...stats.currency,
      tickets: stats.currency.tickets + ticketsEarned
    }
  };
  return { next, ticketsEarned };
}

export function applyTicketDelta(stats: PortalStats, delta: number): PortalStats {
  const nextTickets = Math.max(0, Math.trunc(stats.currency.tickets + delta));
  return {
    ...stats,
    currency: {
      ...stats.currency,
      tickets: nextTickets
    }
  };
}
