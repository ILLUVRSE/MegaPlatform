'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tag } from '@/components/ui/tag';
import type { ArtistProfile } from '@/lib/artists';

interface TaxonomyArtistListClientProps {
  artists: ArtistProfile[];
  contextLabel: string;
}

type SortKey = 'name' | 'movement' | 'era';

export function TaxonomyArtistListClient({ artists, contextLabel }: TaxonomyArtistListClientProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return artists
      .filter((artist) => normalized.length === 0 || artist.name.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === 'movement') {
          return a.movement.localeCompare(b.movement) || a.name.localeCompare(b.name);
        }
        if (sort === 'era') {
          return a.era.localeCompare(b.era) || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [artists, query, sort]);

  return (
    <section className="space-y-4">
      <Card className="space-y-4 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-river">{contextLabel}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Search artists</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Sort</span>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="name">Name (A-Z)</option>
              <option value="movement">Movement</option>
              <option value="era">Era</option>
            </Select>
          </label>
        </div>
      </Card>

      <p className="text-sm text-ink/75 dark:text-white/75">
        Showing <span className="font-semibold text-ink dark:text-white">{filtered.length}</span> of{' '}
        <span className="font-semibold text-ink dark:text-white">{artists.length}</span> artists.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((artist) => (
          <Card key={artist.slug} className="space-y-3 p-4">
            <h3 className="font-[var(--font-serif)] text-xl font-semibold text-ink dark:text-white">{artist.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Tag>{artist.discipline}</Tag>
              <Tag>{artist.era}</Tag>
              <Tag>{artist.movement}</Tag>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/artists/${artist.slug}`} className="font-semibold text-river underline-offset-2 hover:underline">
                Artist page
              </Link>
              <Link href="/artists" className="font-semibold text-river underline-offset-2 hover:underline">
                All artists
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
