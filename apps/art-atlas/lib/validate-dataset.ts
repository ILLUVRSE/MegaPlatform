import type { AtlasDataset, ConfidenceLevel } from './types';

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['high', 'medium', 'low'];

export interface ValidateOptions {
  checkRemote?: boolean;
  urlExists?: (url: string) => Promise<boolean>;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFutureIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return parsed.getTime() > todayUtc.getTime();
}

export async function validateDataset(dataset: AtlasDataset, options: ValidateOptions = {}): Promise<void> {
  const { checkRemote = false, urlExists } = options;
  const slugs = new Set<string>();

  assert(dataset.artworks.length >= 12, 'Dataset must include at least 12 artworks.');

  for (const artwork of dataset.artworks) {
    assert(artwork.slug.length > 0, 'Missing slug.');
    assert(!slugs.has(artwork.slug), `Duplicate slug: ${artwork.slug}`);
    slugs.add(artwork.slug);

    assert(artwork.title.length > 0, `Missing title for ${artwork.slug}`);
    assert(artwork.year === null || Number.isFinite(artwork.year), `Year must be number|null for ${artwork.slug}`);
    assert(artwork.medium.length > 0, `Missing medium for ${artwork.slug}`);
    assert(artwork.dimensions === null || artwork.dimensions.length > 0, `Dimensions must be string|null for ${artwork.slug}`);
    assert(artwork.institution.length > 0, `Missing institution for ${artwork.slug}`);
    assert(artwork.location.length > 0, `Missing location for ${artwork.slug}`);
    assert(Array.isArray(artwork.tags) && artwork.tags.length > 0, `Tags must be non-empty for ${artwork.slug}`);
    assert(Array.isArray(artwork.themes) && artwork.themes.length > 0, `Themes must be non-empty for ${artwork.slug}`);
    assert(artwork.description.length > 0, `Missing description for ${artwork.slug}`);

    assert(artwork.image && typeof artwork.image === 'object', `Missing image object for ${artwork.slug}`);
    assert(isHttpsUrl(artwork.image.url), `Image URL must be https for ${artwork.slug}`);
    assert(Number.isFinite(artwork.image.width) && artwork.image.width > 0, `Image width must be positive for ${artwork.slug}`);
    assert(Number.isFinite(artwork.image.height) && artwork.image.height > 0, `Image height must be positive for ${artwork.slug}`);

    assert(isHttpsUrl(artwork.sourceUrl), `Source URL must be https for ${artwork.slug}`);
    assert(Array.isArray(artwork.referenceUrls), `referenceUrls must be an array for ${artwork.slug}`);
    artwork.referenceUrls.forEach((url, index) => {
      assert(isHttpsUrl(url), `Reference URL #${index + 1} must be https for ${artwork.slug}`);
    });

    assert(artwork.rights.length > 0, `Missing rights for ${artwork.slug}`);
    assert(artwork.creditLine.length > 0, `Missing creditLine for ${artwork.slug}`);
    assert(Array.isArray(artwork.context) && artwork.context.length >= 2 && artwork.context.length <= 4, `Context must contain 2-4 bullets for ${artwork.slug}`);
    assert(Number.isFinite(artwork.popularity), `Popularity must be numeric for ${artwork.slug}`);

    assert(isIsoDate(artwork.lastVerified), `lastVerified must be YYYY-MM-DD for ${artwork.slug}`);
    assert(!isFutureIsoDate(artwork.lastVerified), `lastVerified cannot be in the future for ${artwork.slug}`);

    assert(CONFIDENCE_LEVELS.includes(artwork.confidence.year), `Invalid confidence.year for ${artwork.slug}`);
    assert(CONFIDENCE_LEVELS.includes(artwork.confidence.dimensions), `Invalid confidence.dimensions for ${artwork.slug}`);
    assert(CONFIDENCE_LEVELS.includes(artwork.confidence.image), `Invalid confidence.image for ${artwork.slug}`);

    if (checkRemote) {
      assert(typeof urlExists === 'function', 'urlExists function is required when checkRemote=true');
      const checkUrl = urlExists as (url: string) => Promise<boolean>;
      const checks = [artwork.image.url, artwork.sourceUrl, ...artwork.referenceUrls];
      for (const url of checks) {
        const ok = await checkUrl(url);
        assert(ok, `URL is not reachable for ${artwork.slug}: ${url}`);
      }
    }
  }
}
