import dataset from '@/data/bingham.json';
import type { Artwork, AtlasDataset, AtlasTheme } from '@/lib/types';

const typedDataset = dataset as AtlasDataset;

export const atlasMeta = {
  biographySource: typedDataset.biographySource,
  furtherStudy: typedDataset.furtherStudy
};

export const artworks = [...typedDataset.artworks].sort((a, b) => {
  const ay = a.year ?? Number.MAX_SAFE_INTEGER;
  const by = b.year ?? Number.MAX_SAFE_INTEGER;
  return ay - by;
});

export function getArtworkBySlug(slug: string): Artwork | undefined {
  return artworks.find((artwork) => artwork.slug === slug);
}

export function getDecade(year: number | null): number | null {
  if (year === null) {
    return null;
  }
  return Math.floor(year / 10) * 10;
}

export function getRelatedWorks(artwork: Artwork, limit = 3): Artwork[] {
  const targetDecade = getDecade(artwork.year);

  return artworks
    .filter((candidate) => candidate.slug !== artwork.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => artwork.tags.includes(tag)).length;
      const sharedThemes = candidate.themes.filter((theme) => artwork.themes.includes(theme as AtlasTheme)).length;
      const sameDecade = targetDecade !== null && getDecade(candidate.year) === targetDecade ? 1 : 0;

      return {
        artwork: candidate,
        score: sharedTags * 3 + sharedThemes * 2 + sameDecade
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.artwork);
}

export function listInstitutions(): string[] {
  return Array.from(new Set(artworks.map((artwork) => artwork.institution))).sort();
}

export function listThemes(): AtlasTheme[] {
  return ['River Life', 'Politics', 'Portraits', 'Landscape'];
}
