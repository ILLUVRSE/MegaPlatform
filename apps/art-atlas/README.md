# Art Atlas

Art Atlas is a Next.js App Router app with a searchable 101-artist directory (painters, sculptors, composers) plus a museum-style George Caleb Bingham collection experience.
Each artist has a dedicated page that loads public-domain artwork and classical audio in-app.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Local dataset: `data/bingham.json`

## Routes

- `/` Home
- `/artists` Searchable artist explorer with discipline/period/region filters
- `/artists/[slug]` Artist page with public artwork gallery and in-app audio playback
- `/collection` Aggregated favorites with export/import
- `/eras/[slug]` Era collection pages with filtered artist browsing
- `/movements/[slug]` Movement collection pages with filtered artist browsing
- `/gallery` Filterable gallery with URL-shareable state
- `/artwork/[slug]` Detail page with zoom/pan, rights, citations, related works
- `/timeline` Decade-grouped timeline with thumbnails
- `/sources` Rights/source table and print-friendly layout

## Run

```bash
npm install
npm run dev
```

## Validation, Tests, Verification

- Schema validation: `npm run validate:data`
- Strict URL reachability validation: `npm run validate:data:strict`
- Tests: `npm run test`
- Full verification (validation + lint + typecheck + tests): `npm run verify`
- Build (includes validation): `npm run build`
- Build offline artist media cache: `npm run build:artist-cache -- --limit=300`

## Public Media Source

- Artist media pages use Wikimedia Commons API at runtime.
- The app paginates through available results per artist and loads up to 1000 public-domain items per media type.
- The app filters returned results to public-domain style licenses (`Public domain`, `CC0`, `PDM`).
- The app caches artist media responses server-side for faster repeat loads.
- The API can serve pre-materialized cache records from `data/artist-media-cache.json` when available.
- Artist detail pages use tabs (`Overview`, `Gallery`, `Music`) and load media on demand.
- Artist detail pages prefetch the non-active media tab during idle time.
- Favorites for gallery items and audio tracks are stored per artist in browser local storage.
- `/collection` aggregates favorites across artists and supports JSON export/import merge.
- Availability depends on external source metadata and may vary by artist.

## Changelog (Latest Wave)

- Added artist relationship metadata (`era`, `movement`, `mediums`, influence links) and Related Artists on artist pages.
- Added structured browsing routes for eras and movements with CollectionPage JSON-LD.
- Added breadcrumb UI + BreadcrumbList JSON-LD on artists, artist detail, era, and movement routes.
- Added My Collection route for cross-artist favorites management with export/import.
- Added deterministic media ranking to improve noisy Wikimedia result quality.

## Favorites Migration Notes

- Legacy localStorage favorites shape (`{ image: string[], audio: string[] }`) is still accepted.
- The app now writes v2 records with metadata (`title`, `sourceUrl`, `license`, `thumbnailUrl`, `savedAt`) for richer collection views.

## Dataset Schema (per artwork)

```json
{
  "slug": "jolly-flatboatmen",
  "title": "The Jolly Flatboatmen",
  "year": 1846,
  "medium": "Oil on canvas",
  "dimensions": "96.8 x 123.2 cm (38 1/8 x 48 1/2 in.)",
  "institution": "National Gallery of Art",
  "location": "Washington, D.C., USA",
  "themes": ["River Life"],
  "tags": ["Missouri River"],
  "description": "...",
  "image": {
    "url": "https://...",
    "width": 1900,
    "height": 1480
  },
  "sourceUrl": "https://...",
  "referenceUrls": ["https://..."],
  "rights": "...",
  "creditLine": "...",
  "context": ["...", "..."],
  "popularity": 1,
  "lastVerified": "2026-03-02",
  "confidence": {
    "year": "high",
    "dimensions": "high",
    "image": "medium"
  }
}
```

## Add/Update an Artwork Safely

1. Add or update the object in `data/bingham.json` with all required fields.
2. Use `https://` for `image.url`, `sourceUrl`, and each `referenceUrls` value.
3. Set `lastVerified` in `YYYY-MM-DD` format.
4. Use `confidence` values from `high|medium|low`.
5. Run:

```bash
npm run verify
npm run build
```

## Audit Notes

See `docs/AUDIT.md` for the v2 prioritized audit and fix list.
