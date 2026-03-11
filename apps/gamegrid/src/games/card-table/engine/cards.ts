export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  rank: number;
  suit: Suit;
}

export interface HandRank {
  category: number;
  tiebreak: number[];
  label: string;
}

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'] as const;

export function allSuits(): readonly Suit[] {
  return SUITS;
}

export function cardToString(card: Card): string {
  const rank =
    card.rank === 14
      ? 'A'
      : card.rank === 13
        ? 'K'
        : card.rank === 12
          ? 'Q'
          : card.rank === 11
            ? 'J'
            : String(card.rank);
  return `${rank}${card.suit}`;
}

export function compareHandRank(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i += 1) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function rankCounts(cards: readonly Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = 0; i < cards.length; i += 1) {
    const rank = cards[i].rank;
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  return counts;
}

function sortedRanks(cards: readonly Card[]): number[] {
  return cards.map((c) => c.rank).sort((a, b) => b - a);
}

function isFlush(cards: readonly Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

function straightHigh(cards: readonly Card[]): number | null {
  const uniq = [...new Set(cards.map((c) => c.rank))].sort((a, b) => b - a);
  if (uniq.length !== 5) return null;
  if (uniq[0] - uniq[4] === 4) return uniq[0];
  if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) return 5;
  return null;
}

export function evaluateFiveCardHand(cards: readonly Card[]): HandRank {
  if (cards.length !== 5) {
    throw new Error('evaluateFiveCardHand requires exactly 5 cards');
  }

  const counts = rankCounts(cards);
  const byFreq = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });
  const flush = isFlush(cards);
  const straight = straightHigh(cards);

  if (flush && straight !== null) {
    return { category: 8, tiebreak: [straight], label: straight === 14 ? 'Royal Flush' : 'Straight Flush' };
  }

  if (byFreq[0][1] === 4) {
    return { category: 7, tiebreak: [byFreq[0][0], byFreq[1][0]], label: 'Four of a Kind' };
  }

  if (byFreq[0][1] === 3 && byFreq[1][1] === 2) {
    return { category: 6, tiebreak: [byFreq[0][0], byFreq[1][0]], label: 'Full House' };
  }

  if (flush) {
    return { category: 5, tiebreak: sortedRanks(cards), label: 'Flush' };
  }

  if (straight !== null) {
    return { category: 4, tiebreak: [straight], label: 'Straight' };
  }

  if (byFreq[0][1] === 3) {
    const kickers = byFreq.slice(1).map((x) => x[0]).sort((a, b) => b - a);
    return { category: 3, tiebreak: [byFreq[0][0], ...kickers], label: 'Three of a Kind' };
  }

  if (byFreq[0][1] === 2 && byFreq[1][1] === 2) {
    const highPair = Math.max(byFreq[0][0], byFreq[1][0]);
    const lowPair = Math.min(byFreq[0][0], byFreq[1][0]);
    const kicker = byFreq[2][0];
    return { category: 2, tiebreak: [highPair, lowPair, kicker], label: 'Two Pair' };
  }

  if (byFreq[0][1] === 2) {
    const kickers = byFreq.slice(1).map((x) => x[0]).sort((a, b) => b - a);
    return { category: 1, tiebreak: [byFreq[0][0], ...kickers], label: 'Pair' };
  }

  return { category: 0, tiebreak: sortedRanks(cards), label: 'High Card' };
}

function forEach5ofN<T>(items: readonly T[], cb: (combo: T[]) => void): void {
  const n = items.length;
  for (let a = 0; a < n - 4; a += 1) {
    for (let b = a + 1; b < n - 3; b += 1) {
      for (let c = b + 1; c < n - 2; c += 1) {
        for (let d = c + 1; d < n - 1; d += 1) {
          for (let e = d + 1; e < n; e += 1) {
            cb([items[a], items[b], items[c], items[d], items[e]]);
          }
        }
      }
    }
  }
}

export function evaluateBestHand(cards: readonly Card[]): HandRank {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('evaluateBestHand requires 5 to 7 cards');
  }

  let best: HandRank | null = null;
  forEach5ofN(cards, (combo) => {
    const rank = evaluateFiveCardHand(combo);
    if (!best || compareHandRank(rank, best) > 0) {
      best = rank;
    }
  });

  if (!best) {
    throw new Error('No hand combinations generated');
  }

  return best;
}
