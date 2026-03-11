'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Tag } from '@/components/ui/tag';
import { getArtistBySlug } from '@/lib/artists';
import {
  buildFavoritesStorageKey,
  collectFavoritesFromStorage,
  parseArtistFavorites,
  stringifyArtistFavorites,
  type CollectionFavoriteItem,
  type FavoriteKind,
  type FavoriteMediaRecord
} from '@/lib/favorites';

interface CollectionImportPayload {
  version?: number;
  items?: Array<{
    artistSlug?: string;
    kind?: FavoriteKind;
    mediaUrl?: string;
    title?: string;
    sourceUrl?: string;
    license?: string;
    thumbnailUrl?: string | null;
    creator?: string;
    savedAt?: string;
  }>;
}

function loadCollection(): CollectionFavoriteItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  return collectFavoritesFromStorage(window.localStorage);
}

function groupByArtist(items: CollectionFavoriteItem[]): Array<{ artistSlug: string; artistName: string; items: CollectionFavoriteItem[] }> {
  const map = new Map<string, { artistSlug: string; artistName: string; items: CollectionFavoriteItem[] }>();

  for (const item of items) {
    const group = map.get(item.artistSlug);
    if (group) {
      group.items.push(item);
      continue;
    }
    map.set(item.artistSlug, {
      artistSlug: item.artistSlug,
      artistName: item.artistName,
      items: [item]
    });
  }

  return [...map.values()].sort((a, b) => a.artistName.localeCompare(b.artistName));
}

function isValidImport(payload: unknown): payload is CollectionImportPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as CollectionImportPayload;
  return Array.isArray(candidate.items);
}

export function CollectionClient() {
  const [items, setItems] = useState<CollectionFavoriteItem[]>(() => loadCollection());
  const [message, setMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => groupByArtist(items), [items]);

  const removeFavorite = (artistSlug: string, kind: FavoriteKind, mediaUrl: string) => {
    const key = buildFavoritesStorageKey(artistSlug);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }

    const parsed = parseArtistFavorites(raw);
    if (kind === 'image') {
      parsed.image = parsed.image.filter((entry) => entry.mediaUrl !== mediaUrl);
    } else {
      parsed.audio = parsed.audio.filter((entry) => entry.mediaUrl !== mediaUrl);
    }

    localStorage.setItem(key, stringifyArtistFavorites(parsed));
    setItems(loadCollection());
  };

  const exportFavorites = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      items
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'art-atlas-favorites.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Favorites exported.');
  };

  const importFavorites = async (file: File) => {
    const text = await file.text();
    let parsedUnknown: unknown;

    try {
      parsedUnknown = JSON.parse(text) as unknown;
    } catch {
      setMessage('Import failed: invalid JSON file.');
      return;
    }

    if (!isValidImport(parsedUnknown)) {
      setMessage('Import failed: unexpected format.');
      return;
    }

    const parsed = parsedUnknown as CollectionImportPayload;
    const grouped = new Map<string, { image: FavoriteMediaRecord[]; audio: FavoriteMediaRecord[] }>();

    for (const entry of parsed.items ?? []) {
      if (!entry.artistSlug || !entry.kind || !entry.mediaUrl) {
        continue;
      }
      const artist = getArtistBySlug(entry.artistSlug);
      if (!artist) {
        continue;
      }

      const group = grouped.get(entry.artistSlug) ?? { image: [], audio: [] };
      const record: FavoriteMediaRecord = {
        mediaUrl: entry.mediaUrl,
        title: entry.title,
        sourceUrl: entry.sourceUrl,
        license: entry.license,
        thumbnailUrl: entry.thumbnailUrl ?? null,
        creator: entry.creator,
        savedAt: entry.savedAt ?? new Date().toISOString()
      };

      const target = entry.kind === 'audio' ? group.audio : group.image;
      if (!target.some((item) => item.mediaUrl === record.mediaUrl)) {
        target.push(record);
      }

      grouped.set(entry.artistSlug, group);
    }

    for (const [artistSlug, incoming] of grouped.entries()) {
      const key = buildFavoritesStorageKey(artistSlug);
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? parseArtistFavorites(existingRaw) : { version: 2 as const, image: [], audio: [] };

      const mergedImage = [...existing.image];
      incoming.image.forEach((record) => {
        if (!mergedImage.some((item) => item.mediaUrl === record.mediaUrl)) {
          mergedImage.push(record);
        }
      });

      const mergedAudio = [...existing.audio];
      incoming.audio.forEach((record) => {
        if (!mergedAudio.some((item) => item.mediaUrl === record.mediaUrl)) {
          mergedAudio.push(record);
        }
      });

      localStorage.setItem(
        key,
        stringifyArtistFavorites({
          version: 2,
          image: mergedImage,
          audio: mergedAudio
        })
      );
    }

    setItems(loadCollection());
    setMessage('Favorites imported and merged successfully.');
  };

  return (
    <section className="space-y-6">
      <SectionTitle title="My Collection" subtitle="Your saved favorites across all artists" />

      <Card className="space-y-3 p-4">
        <p className="text-sm text-ink/80 dark:text-white/80">Stored locally in your browser. Export JSON for backup or import to merge favorites.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={exportFavorites} disabled={items.length === 0}>
            Export favorites
          </Button>
          <Button type="button" variant="secondary" onClick={() => importInputRef.current?.click()}>
            Import favorites
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void importFavorites(file);
              }
              event.currentTarget.value = '';
            }}
          />
        </div>
        {message ? <p className="text-sm text-river">{message}</p> : null}
      </Card>

      {groups.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-ink/75 dark:text-white/75">No favorites saved yet. Open an artist page and save items from Gallery or Music tabs.</p>
          <Link href="/artists" className="mt-2 inline-flex text-sm font-semibold text-river underline-offset-2 hover:underline">
            Browse artists
          </Link>
        </Card>
      ) : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <Card key={group.artistSlug} className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-[var(--font-serif)] text-2xl font-semibold text-ink dark:text-white">{group.artistName}</h3>
              <Link href={`/artists/${group.artistSlug}`} className="text-sm font-semibold text-river underline-offset-2 hover:underline">
                Open artist page
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Card key={`${item.kind}:${item.mediaUrl}`} className="space-y-3 p-3">
                  {item.kind === 'image' && item.thumbnailUrl ? (
                    <Image src={item.thumbnailUrl} alt={item.title ?? 'Favorite artwork'} width={640} height={440} className="h-36 w-full rounded-xl object-cover" />
                  ) : null}

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink dark:text-white">{item.title ?? item.mediaUrl}</p>
                    <div className="flex flex-wrap gap-2">
                      <Tag>{item.kind === 'audio' ? 'Audio' : 'Artwork'}</Tag>
                      {item.license ? <Tag>{item.license}</Tag> : null}
                    </div>
                  </div>

                  {item.kind === 'audio' ? (
                    <audio controls preload="none" className="w-full">
                      <source src={item.mediaUrl} />
                    </audio>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-river underline-offset-2 hover:underline">
                        Source
                      </a>
                    ) : null}
                    <Button type="button" variant="secondary" onClick={() => removeFavorite(item.artistSlug, item.kind, item.mediaUrl)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
