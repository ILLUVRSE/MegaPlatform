'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SectionTitle } from '@/components/ui/section-title';
import { Select } from '@/components/ui/select';
import { Tag } from '@/components/ui/tag';
import type { ArtistProfile } from '@/lib/artists';
import { slugifyTerm } from '@/lib/slug';

interface ArtistDirectoryClientProps {
  artists: ArtistProfile[];
}

type SortKey = 'name' | 'period' | 'region';

export function ArtistDirectoryClient({ artists }: ArtistDirectoryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [discipline, setDiscipline] = useState(searchParams.get('discipline') ?? 'all');
  const [period, setPeriod] = useState(searchParams.get('period') ?? 'all');
  const [region, setRegion] = useState(searchParams.get('region') ?? 'all');
  const [sort, setSort] = useState<SortKey>((searchParams.get('sort') as SortKey) ?? 'name');

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (discipline !== 'all') {
      params.set('discipline', discipline);
    }
    if (period !== 'all') {
      params.set('period', period);
    }
    if (region !== 'all') {
      params.set('region', region);
    }
    if (sort !== 'name') {
      params.set('sort', sort);
    }

    const current = searchParams.toString();
    const next = params.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [discipline, pathname, period, query, region, router, searchParams, sort]);

  const disciplines = useMemo(() => Array.from(new Set(artists.map((artist) => artist.discipline))).sort(), [artists]);
  const periods = useMemo(() => Array.from(new Set(artists.map((artist) => artist.period))).sort(), [artists]);
  const regions = useMemo(() => Array.from(new Set(artists.map((artist) => artist.region))).sort(), [artists]);

  const counts = useMemo(
    () =>
      artists.reduce<Record<string, number>>((acc, artist) => {
        acc[artist.discipline] = (acc[artist.discipline] ?? 0) + 1;
        return acc;
      }, {}),
    [artists]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return artists
      .filter((artist) => {
        const matchesName = normalized.length === 0 || artist.name.toLowerCase().includes(normalized);
        const matchesDiscipline = discipline === 'all' || artist.discipline === discipline;
        const matchesPeriod = period === 'all' || artist.period === period;
        const matchesRegion = region === 'all' || artist.region === region;

        return matchesName && matchesDiscipline && matchesPeriod && matchesRegion;
      })
      .sort((a, b) => {
        if (sort === 'period') {
          return a.period.localeCompare(b.period) || a.name.localeCompare(b.name);
        }
        if (sort === 'region') {
          return a.region.localeCompare(b.region) || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [artists, discipline, period, query, region, sort]);

  const activeFilterCount = (query.trim() ? 1 : 0) + (discipline !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0) + (region !== 'all' ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setDiscipline('all');
    setPeriod('all');
    setRegion('all');
    setSort('name');
  };

  return (
    <section className="space-y-6">
      <SectionTitle
        title="Artist Explorer"
        subtitle={`${artists.length} artists across painting, sculpture, and composition`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Painters</p>
          <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{counts.Painter ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Sculptors</p>
          <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{counts.Sculptor ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Composers</p>
          <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{counts.Composer ?? 0}</p>
        </Card>
      </div>

      <Card className="space-y-4 p-4">
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-ink dark:text-white">Search artist name</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g., Picasso, Debussy, Rodin" />
        </label>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Discipline</span>
            <Select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
              <option value="all">All disciplines</option>
              {disciplines.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Period</span>
            <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="all">All periods</option>
              {periods.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Region</span>
            <Select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="all">All regions</option>
              {regions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink dark:text-white">Sort</span>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="name">Name (A-Z)</option>
              <option value="period">Period</option>
              <option value="region">Region</option>
            </Select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-ink/70 dark:text-white/70">Active filters: {activeFilterCount}</p>
          <Button type="button" variant="secondary" onClick={clearAll} disabled={activeFilterCount === 0 && sort === 'name'}>
            Clear all
          </Button>
        </div>
      </Card>

      <p className="text-sm text-ink/75 dark:text-white/75">
        Showing <span className="font-semibold text-ink dark:text-white">{filtered.length}</span> of{' '}
        <span className="font-semibold text-ink dark:text-white">{artists.length}</span> artists.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((artist) => (
          <Card key={artist.name} className="space-y-3 p-4">
            <h3 className="font-[var(--font-serif)] text-xl font-semibold text-ink dark:text-white">{artist.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Tag>{artist.discipline}</Tag>
              <Tag>{artist.era}</Tag>
              <Tag>{artist.region}</Tag>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/artists/${artist.slug}`} className="font-semibold text-river underline-offset-2 hover:underline">
                Open gallery and music
              </Link>
              <Link href={`/movements/${slugifyTerm(artist.movement)}`} className="font-semibold text-river underline-offset-2 hover:underline">
                Movement
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
