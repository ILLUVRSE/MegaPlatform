'use client';

import { useState } from 'react';

export function WatchlistToggleButton({ titleId, initialInWatchlist }: { titleId: string; initialInWatchlist: boolean }) {
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const action = inWatchlist ? 'remove' : 'add';

    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, titleId })
    });

    if (res.ok) setInWatchlist((prev) => !prev);
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
    >
      {loading ? 'Saving...' : inWatchlist ? 'Remove Watchlist' : '+ Watchlist'}
    </button>
  );
}
