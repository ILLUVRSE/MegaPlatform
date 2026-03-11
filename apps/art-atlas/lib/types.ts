export type AtlasTheme = 'River Life' | 'Politics' | 'Portraits' | 'Landscape';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ArtworkImage {
  url: string;
  width: number;
  height: number;
}

export interface ArtworkConfidence {
  year: ConfidenceLevel;
  dimensions: ConfidenceLevel;
  image: ConfidenceLevel;
}

export interface Artwork {
  slug: string;
  title: string;
  year: number | null;
  medium: string;
  dimensions: string | null;
  institution: string;
  location: string;
  themes: AtlasTheme[];
  tags: string[];
  description: string;
  image: ArtworkImage;
  sourceUrl: string;
  referenceUrls: string[];
  rights: string;
  creditLine: string;
  context: string[];
  popularity: number;
  lastVerified: string;
  confidence: ArtworkConfidence;
}

export interface AtlasDataset {
  biographySource: {
    title: string;
    url: string;
  };
  furtherStudy: {
    title: string;
    url: string;
  };
  artworks: Artwork[];
}
