'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import type { Artwork } from '@/lib/types';

export function FeaturedCarousel({ artworks }: { artworks: Artwork[] }) {
  const featured = useMemo(() => [...artworks].sort((a, b) => a.popularity - b.popularity).slice(0, 5), [artworks]);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (featured.length <= 1 || reduceMotion) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % featured.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [featured.length, reduceMotion]);

  if (featured.length === 0) {
    return null;
  }

  const active = featured[index];

  return (
    <section aria-labelledby="featured-heading" className="space-y-4">
      <SectionTitle
        title="Featured Works"
        subtitle="Selected works with high interpretive impact"
        rightSlot={
          <div className="flex gap-1" role="tablist" aria-label="Featured artworks">
            {featured.map((artwork, dot) => (
              <button
                key={artwork.slug}
                type="button"
                className={`h-2.5 w-7 rounded-full ${dot === index ? 'bg-river' : 'bg-ink/20 dark:bg-white/25'}`}
                onClick={() => setIndex(dot)}
                aria-label={`Show ${artwork.title}`}
                aria-selected={dot === index}
                role="tab"
              />
            ))}
          </div>
        }
      />
      <Card className="overflow-hidden">
        <Image
          src={active.image.url}
          alt={active.title}
          width={active.image.width}
          height={active.image.height}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, 70vw"
          priority
        />
        <div className="space-y-2 p-4 sm:p-6">
          <p className="text-sm uppercase tracking-wide text-river">{active.year ?? 'Unknown year'}</p>
          <h3 className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">{active.title}</h3>
          <p className="text-sm text-ink/80 dark:text-white/80">{active.description}</p>
          <Link href={`/artwork/${active.slug}`} className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-river dark:bg-river dark:hover:bg-pine">
            View details
          </Link>
        </div>
      </Card>
    </section>
  );
}
