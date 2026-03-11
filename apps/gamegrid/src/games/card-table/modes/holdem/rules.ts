import { compareHandRank, evaluateBestHand, type Card } from '../../engine/cards';
import type { HoldemPlayer, HoldemPot, HoldemShowdownResult } from './types';

export function buildSidePots(players: readonly HoldemPlayer[]): HoldemPot[] {
  const active = players.filter((p) => p.committed > 0);
  const thresholds = [...new Set(active.map((p) => p.committed))].sort((a, b) => a - b);
  const pots: HoldemPot[] = [];
  let prev = 0;

  for (let i = 0; i < thresholds.length; i += 1) {
    const level = thresholds[i];
    const contributors = active.filter((p) => p.committed >= level);
    const eligible = contributors.filter((p) => !p.folded).map((p) => p.id);
    const amount = (level - prev) * contributors.length;
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible });
    }
    prev = level;
  }

  return pots;
}

export function resolveHoldemShowdown(players: readonly HoldemPlayer[], board: readonly Card[]): HoldemShowdownResult {
  const pots = buildSidePots(players);
  const payouts: Record<string, number> = {};
  const ranks: Record<string, ReturnType<typeof evaluateBestHand>> = {};

  for (let i = 0; i < players.length; i += 1) {
    payouts[players[i].id] = 0;
    if (!players[i].folded) {
      ranks[players[i].id] = evaluateBestHand([...board, ...players[i].cards]);
    }
  }

  for (let i = 0; i < pots.length; i += 1) {
    const pot = pots[i];
    let winners: string[] = [];
    let best: ReturnType<typeof evaluateBestHand> | null = null;

    for (let j = 0; j < pot.eligible.length; j += 1) {
      const id = pot.eligible[j];
      const rank = ranks[id];
      if (!rank) continue;
      if (!best || compareHandRank(rank, best) > 0) {
        best = rank;
        winners = [id];
      } else if (compareHandRank(rank, best) === 0) {
        winners.push(id);
      }
    }

    if (winners.length === 0) continue;
    const split = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - split * winners.length;
    for (let j = 0; j < winners.length; j += 1) {
      payouts[winners[j]] += split;
      if (remainder > 0) {
        payouts[winners[j]] += 1;
        remainder -= 1;
      }
    }
  }

  return { payouts, ranks, pots };
}
