import type { Metadata } from 'next';
import { GalleryClient } from '@/components/gallery-client';
import { artworks, listInstitutions, listThemes } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Filter and sort George Caleb Bingham artworks by theme, institution, year, and keyword.',
  openGraph: {
    title: 'Bingham Atlas — Gallery',
    description: 'Browse Bingham works with shareable filtering and sorting.'
  }
};

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function GalleryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const numericYears = artworks.map((work) => work.year).filter((year): year is number => year !== null);
  const minYearDefault = Math.min(...numericYears);
  const maxYearDefault = Math.max(...numericYears);

  const initialThemes = typeof params.themes === 'string' ? [params.themes] : Array.isArray(params.themes) ? params.themes : [];
  const initialTags = typeof params.tags === 'string' ? [params.tags] : Array.isArray(params.tags) ? params.tags : [];
  const initialInstitution = typeof params.institution === 'string' ? params.institution : 'all';
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const initialSort = typeof params.sort === 'string' ? params.sort : 'popular';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <GalleryClient
        artworks={artworks}
        themes={listThemes()}
        institutions={listInstitutions()}
        initialState={{
          themes: initialThemes,
          tags: initialTags,
          institution: initialInstitution,
          minYear: parseNumber(typeof params.minYear === 'string' ? params.minYear : undefined, minYearDefault),
          maxYear: parseNumber(typeof params.maxYear === 'string' ? params.maxYear : undefined, maxYearDefault),
          q: initialQuery,
          sort: initialSort === 'year-asc' || initialSort === 'year-desc' || initialSort === 'title-asc' || initialSort === 'popular' ? initialSort : 'popular'
        }}
      />
    </div>
  );
}
