import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { artistDirectory } from '../lib/artists';
import { fetchPublicDomainMedia } from '../lib/public-media';

interface CacheArtistEntry {
  image: Awaited<ReturnType<typeof fetchPublicDomainMedia>>['items'];
  audio: Awaited<ReturnType<typeof fetchPublicDomainMedia>>['items'];
}

interface CacheDocument {
  generatedAt: string;
  source: string;
  artists: Record<string, CacheArtistEntry>;
}

function parseLimitArg(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  if (!limitArg) {
    return 300;
  }
  const raw = Number(limitArg.split('=')[1]);
  if (!Number.isFinite(raw)) {
    return 300;
  }
  return Math.max(1, Math.min(3000, Math.floor(raw)));
}

async function main() {
  const limit = parseLimitArg();
  const result: CacheDocument = {
    generatedAt: new Date().toISOString(),
    source: 'wikimedia-commons',
    artists: {}
  };

  for (const artist of artistDirectory) {
    console.log(`Caching media for ${artist.name}...`);

    const [imageResult, audioResult] = await Promise.all([
      fetchPublicDomainMedia(artist.mediaQuery, 'image', { maxItems: limit, maxPages: 100 }).catch(() => ({ items: [] })),
      fetchPublicDomainMedia(artist.mediaQuery, 'audio', { maxItems: limit, maxPages: 100 }).catch(() => ({ items: [] }))
    ]);

    result.artists[artist.slug] = {
      image: imageResult.items ?? [],
      audio: audioResult.items ?? []
    };
  }

  const outputPath = path.join(process.cwd(), 'data', 'artist-media-cache.json');
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote cache file: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
