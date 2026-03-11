'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SectionTitle } from '@/components/ui/section-title';
import { Select } from '@/components/ui/select';
import { Tag } from '@/components/ui/tag';
import { Toast } from '@/components/ui/toast';
import type { Artwork, AtlasTheme } from '@/lib/types';

type SortKey = 'year-asc' | 'year-desc' | 'title-asc' | 'popular';

interface GalleryClientProps {
  artworks: Artwork[];
  themes: AtlasTheme[];
  institutions: string[];
  initialState: {
    themes: string[];
    tags: string[];
    institution: string;
    minYear: number;
    maxYear: number;
    q: string;
    sort: SortKey;
  };
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export function GalleryClient({ artworks, themes, institutions, initialState }: GalleryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hardMin = Math.min(...artworks.map((work) => work.year ?? 9999));
  const hardMax = Math.max(...artworks.map((work) => work.year ?? 0));

  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [search, setSearch] = useState(initialState.q);
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set(initialState.themes));
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(initialState.tags));
  const [selectedInstitution, setSelectedInstitution] = useState(initialState.institution || 'all');
  const [yearMin, setYearMin] = useState(initialState.minYear || hardMin);
  const [yearMax, setYearMax] = useState(initialState.maxYear || hardMax);
  const [sort, setSort] = useState<SortKey>(initialState.sort || 'popular');
  const [toastOpen, setToastOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 280);

  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch.trim()) {
      params.set('q', debouncedSearch.trim());
    }
    if (selectedInstitution !== 'all') {
      params.set('institution', selectedInstitution);
    }
    if (sort !== 'popular') {
      params.set('sort', sort);
    }
    if (yearMin !== hardMin) {
      params.set('minYear', String(yearMin));
    }
    if (yearMax !== hardMax) {
      params.set('maxYear', String(yearMax));
    }
    [...selectedThemes].forEach((theme) => params.append('themes', theme));
    [...selectedTags].forEach((tag) => params.append('tags', tag));

    const query = params.toString();
    const current = searchParams.toString();
    if (query !== current) {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, hardMax, hardMin, pathname, router, searchParams, selectedInstitution, selectedTags, selectedThemes, sort, yearMax, yearMin]);

  useEffect(() => {
    if (!isMobileFiltersOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileFiltersOpen]);

  const filtered = useMemo(() => {
    const normalized = debouncedSearch.toLowerCase().trim();

    return artworks
      .filter((work) => {
        const year = work.year;
        const matchesTheme = selectedThemes.size === 0 || work.themes.some((theme) => selectedThemes.has(theme));
        const matchesTag = selectedTags.size === 0 || [...selectedTags].some((tag) => work.tags.includes(tag));
        const matchesInstitution = selectedInstitution === 'all' || work.institution === selectedInstitution;
        const matchesYear = year !== null && year >= yearMin && year <= yearMax;
        const matchesQuery =
          normalized.length === 0 ||
          work.title.toLowerCase().includes(normalized) ||
          work.description.toLowerCase().includes(normalized) ||
          work.tags.some((tag) => tag.toLowerCase().includes(normalized));

        return matchesTheme && matchesTag && matchesInstitution && matchesYear && matchesQuery;
      })
      .sort((a, b) => {
        switch (sort) {
          case 'year-asc':
            return (a.year ?? 9999) - (b.year ?? 9999);
          case 'year-desc':
            return (b.year ?? -1) - (a.year ?? -1);
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'popular':
          default:
            return a.popularity - b.popularity;
        }
      });
  }, [artworks, debouncedSearch, selectedInstitution, selectedTags, selectedThemes, sort, yearMax, yearMin]);

  const activeFilterCount =
    selectedThemes.size +
    selectedTags.size +
    (selectedInstitution !== 'all' ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0) +
    (yearMin !== hardMin || yearMax !== hardMax ? 1 : 0) +
    (sort !== 'popular' ? 1 : 0);

  const clearAll = () => {
    if (activeFilterCount > 2) {
      setConfirmClearOpen(true);
      return;
    }

    runClearAll();
  };

  const runClearAll = () => {
    setSearch('');
    setSelectedThemes(new Set());
    setSelectedTags(new Set());
    setSelectedInstitution('all');
    setYearMin(hardMin);
    setYearMax(hardMax);
    setSort('popular');
    setConfirmClearOpen(false);
    setToastOpen(true);
  };

  const uniqueMapTags = useMemo(() => {
    const curated = ['Missouri River', 'St. Louis', 'Washington, D.C.', 'New York'];
    return curated.filter((tag) => artworks.some((artwork) => artwork.tags.includes(tag)));
  }, [artworks]);

  const filterPanel = (
    <Card className="space-y-4 p-4">
      <label className="space-y-1 text-sm">
        <span className="font-semibold text-ink dark:text-white">Search title or keyword</span>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g., election, Missouri" />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink dark:text-white">Themes</legend>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => {
            const active = selectedThemes.has(theme);
            return (
              <button
                key={theme}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-river bg-river text-white' : 'border-ink/20 dark:border-white/20'}`}
                onClick={() => {
                  const next = new Set(selectedThemes);
                  if (active) {
                    next.delete(theme);
                  } else {
                    next.add(theme);
                  }
                  setSelectedThemes(next);
                }}
                aria-pressed={active}
              >
                {theme}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink dark:text-white">Map tags</legend>
        <div className="flex flex-wrap gap-2">
          {uniqueMapTags.map((tag) => {
            const active = selectedTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-river bg-river text-white' : 'border-ink/20 dark:border-white/20'}`}
                onClick={() => {
                  const next = new Set(selectedTags);
                  if (active) {
                    next.delete(tag);
                  } else {
                    next.add(tag);
                  }
                  setSelectedTags(next);
                }}
                aria-pressed={active}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="space-y-1 text-sm">
        <span className="font-semibold text-ink dark:text-white">Institution</span>
        <Select value={selectedInstitution} onChange={(event) => setSelectedInstitution(event.target.value)}>
          <option value="all">All institutions</option>
          {institutions.map((institution) => (
            <option key={institution} value={institution}>
              {institution}
            </option>
          ))}
        </Select>
      </label>

      <div className="space-y-2 text-sm">
        <p className="font-semibold text-ink dark:text-white">Year range</p>
        <label className="flex items-center gap-2">
          <span className="w-9 text-xs">Min</span>
          <input
            type="range"
            min={hardMin}
            max={hardMax}
            value={yearMin}
            onChange={(event) => setYearMin(Math.min(Number(event.target.value), yearMax))}
            className="w-full"
            aria-label="Minimum year"
          />
          <span className="w-11 text-right text-xs">{yearMin}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-9 text-xs">Max</span>
          <input
            type="range"
            min={hardMin}
            max={hardMax}
            value={yearMax}
            onChange={(event) => setYearMax(Math.max(Number(event.target.value), yearMin))}
            className="w-full"
            aria-label="Maximum year"
          />
          <span className="w-11 text-right text-xs">{yearMax}</span>
        </label>
      </div>

      <Button variant="secondary" type="button" onClick={clearAll}>
        Clear all
      </Button>
    </Card>
  );

  return (
    <div className="space-y-5">
      <SectionTitle title="Gallery" subtitle="Filter by theme, location tag, institution, and year" />

      <div className="lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setMobileFiltersOpen(true)}>
          Open filters
        </Button>
      </div>

      {isMobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Gallery filters">
          <div className="mx-auto max-w-md space-y-3">
            {filterPanel}
            <div className="flex gap-2">
              <Button type="button" onClick={() => setMobileFiltersOpen(false)}>
                Apply filters
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMobileFiltersOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">{filterPanel}</aside>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/80 dark:text-white/80" aria-live="polite">
              {filtered.length} results
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-ink dark:text-white">Sort</span>
              <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="w-44">
                <option value="popular">Popular</option>
                <option value="year-asc">Year (ascending)</option>
                <option value="year-desc">Year (descending)</option>
                <option value="title-asc">Title (A-Z)</option>
              </Select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {[...selectedThemes].map((theme) => (
              <button key={theme} type="button" aria-label={`Remove theme filter ${theme}`} onClick={() => setSelectedThemes((prev) => new Set([...prev].filter((x) => x !== theme)))}>
                <Tag active>{theme} ×</Tag>
              </button>
            ))}
            {[...selectedTags].map((tag) => (
              <button key={tag} type="button" aria-label={`Remove map tag filter ${tag}`} onClick={() => setSelectedTags((prev) => new Set([...prev].filter((x) => x !== tag)))}>
                <Tag active>{tag} ×</Tag>
              </button>
            ))}
            {selectedInstitution !== 'all' ? (
              <button type="button" aria-label={`Remove institution filter ${selectedInstitution}`} onClick={() => setSelectedInstitution('all')}>
                <Tag active>{selectedInstitution} ×</Tag>
              </button>
            ) : null}
            {debouncedSearch ? (
              <button type="button" aria-label="Remove search filter" onClick={() => setSearch('')}>
                <Tag active>Search: {debouncedSearch} ×</Tag>
              </button>
            ) : null}
            {yearMin !== hardMin || yearMax !== hardMax ? (
              <button type="button" aria-label="Remove year range filter" onClick={() => { setYearMin(hardMin); setYearMax(hardMax); }}>
                <Tag active>{yearMin}-{yearMax} ×</Tag>
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-base font-semibold text-ink dark:text-white">No matching works</p>
              <p className="mt-1 text-sm text-ink/70 dark:text-white/70">Try broadening year range or clearing theme/tag filters.</p>
              <Button type="button" variant="secondary" className="mt-4" onClick={clearAll}>
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((artwork) => (
                <ArtworkCard key={artwork.slug} artwork={artwork} />
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmClearOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm clear filters">
          <Card className="w-full max-w-sm p-5">
            <p className="font-semibold text-ink dark:text-white">Clear all active filters?</p>
            <p className="mt-1 text-sm text-ink/70 dark:text-white/70">You currently have {activeFilterCount} active filters.</p>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={runClearAll}>
                Confirm
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <Toast open={toastOpen} message="Filters cleared" onClose={() => setToastOpen(false)} />
    </div>
  );
}
