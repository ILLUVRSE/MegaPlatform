'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type TouchEvent } from 'react';
import { DiscoverCard } from '@/lib/services/discover';
import { PlatformBadges } from '@/components/PlatformBadges';

type Direction = 'left' | 'right' | 'up';

export function SwipeDeck({ initialItems, queryString }: { initialItems: DiscoverCard[]; queryString?: string }) {
  const [items, setItems] = useState(initialItems);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  const current = useMemo(() => items[0], [items]);

  useEffect(() => {
    if (!items.length) {
      fetch(`/api/discover/queue${queryString ? `?${queryString}` : ''}`)
        .then((r) => r.json())
        .then((data) => setItems(data.items || []))
        .catch(() => null);
    }
  }, [items.length, queryString]);

  const send = async (titleId: string, type: 'like' | 'dislike' | 'detail') => {
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleId, type })
    });
  };

  const swipe = async (direction: Direction) => {
    if (!current) return;

    if (direction === 'right') {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', titleId: current.id })
      });
      await send(current.id, 'like');
    }

    if (direction === 'left') {
      await send(current.id, 'dislike');
    }

    if (direction === 'up') {
      await send(current.id, 'detail');
      window.location.href = `/title/${current.type}/${current.tmdbId}`;
      return;
    }

    setItems((prev) => prev.slice(1));
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    setStart({ x: t.clientX, y: t.clientY });
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      void swipe(dx > 0 ? 'right' : 'left');
    } else if (Math.abs(dy) > 70 && dy < 0) {
      void swipe('up');
    }
    setStart(null);
  };

  if (!current) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
        <p>No cards left right now.</p>
        <p className="mt-1 text-sm text-surf/70">Try again after new trend sync.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div className="relative h-[70vh] overflow-hidden rounded-3xl border border-white/15 card-sheen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Image src={current.backdrop || current.poster} alt={current.name} fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-4">
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <p className="text-2xl font-bold">{current.name}</p>
            <p className="line-clamp-2 text-sm text-surf/85">{current.hook}</p>
            <p className="text-sm">Rating {current.rating.toFixed(1)}</p>
            <PlatformBadges platforms={current.platforms} />
            {current.trailerKey ? (
              <a
                href={`https://www.youtube.com/watch?v=${current.trailerKey}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs"
              >
                Trailer snippet
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <button type="button" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2" onClick={() => void swipe('left')}>
          Swipe Left
        </button>
        <button type="button" className="rounded-xl bg-accent px-3 py-2 font-semibold text-ink" onClick={() => void swipe('right')}>
          Swipe Right
        </button>
        <button type="button" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2" onClick={() => void swipe('up')}>
          Swipe Up
        </button>
      </div>

      <Link href={`/title/${current.type}/${current.tmdbId}`} className="block text-center text-sm text-accent">
        Open full details
      </Link>
    </div>
  );
}
