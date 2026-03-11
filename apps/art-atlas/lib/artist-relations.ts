import type { ArtistProfile } from '@/lib/artists';
import { artistDirectory } from '@/lib/artists';

interface ScoredArtist {
  artist: ArtistProfile;
  score: number;
}

export function getRelatedArtists(artist: ArtistProfile, limit = 8): ArtistProfile[] {
  const influencedSet = new Set([...(artist.influencedBy ?? []), ...(artist.influenced ?? [])]);

  const scored: ScoredArtist[] = artistDirectory
    .filter((candidate) => candidate.slug !== artist.slug)
    .map((candidate) => {
      let score = 0;

      if (candidate.movement === artist.movement) {
        score += 100;
      }
      if (candidate.era === artist.era) {
        score += 40;
      }

      const sharedMediums = candidate.mediums.filter((medium) => artist.mediums.includes(medium)).length;
      score += sharedMediums * 10;

      const candidateLinks = new Set([...(candidate.influencedBy ?? []), ...(candidate.influenced ?? [])]);
      if (influencedSet.has(candidate.slug) || candidateLinks.has(artist.slug)) {
        score += 5;
      }

      return { artist: candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.artist.name.localeCompare(b.artist.name);
    });

  return scored.slice(0, limit).map((entry) => entry.artist);
}
