'use client';

import { useState } from 'react';

export function WatchlistRemoveButton({ titleId }: { titleId: string }) {
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    setLoading(true);
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', titleId })
    });
    window.location.reload();
  };

  return (
    <button type="button" onClick={remove} disabled={loading} className="mt-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-60">
      {loading ? 'Removing...' : 'Remove'}
    </button>
  );
}
