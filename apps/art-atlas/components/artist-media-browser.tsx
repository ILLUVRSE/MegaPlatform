'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Tag } from '@/components/ui/tag';
import type { ArtistProfile } from '@/lib/artists';
import {
  buildFavoritesStorageKey,
  parseArtistFavorites,
  stringifyArtistFavorites,
  type FavoriteMediaRecord
} from '@/lib/favorites';

interface PublicMediaItem {
  id: string;
  title: string;
  creator: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  license: string;
}

interface MediaApiPayload {
  total: number;
  nextCursor: string | null;
  exhausted: boolean;
  cached?: boolean;
  items: PublicMediaItem[];
}

interface ArtistMediaBrowserProps {
  artist: ArtistProfile;
}

type MediaStatus = 'idle' | 'loading' | 'ready' | 'error';
type ArtistTab = 'overview' | 'gallery' | 'music';

async function loadMedia(slug: string, kind: 'image' | 'audio'): Promise<MediaApiPayload> {
  const response = await fetch(`/api/artists/${slug}/media?kind=${kind}&all=1&limit=1000`);
  if (!response.ok) {
    throw new Error(`Unable to load ${kind} results right now.`);
  }
  return (await response.json()) as MediaApiPayload;
}

function scheduleIdleTask(task: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(task);
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timer = window.setTimeout(task, 1000);
  return () => window.clearTimeout(timer);
}

function hasFavorite(records: FavoriteMediaRecord[], mediaUrl: string): boolean {
  return records.some((record) => record.mediaUrl === mediaUrl);
}

function upsertFavorite(records: FavoriteMediaRecord[], item: PublicMediaItem): FavoriteMediaRecord[] {
  if (hasFavorite(records, item.mediaUrl)) {
    return records.filter((record) => record.mediaUrl !== item.mediaUrl);
  }

  return [
    ...records,
    {
      mediaUrl: item.mediaUrl,
      title: item.title,
      sourceUrl: item.sourceUrl,
      license: item.license,
      thumbnailUrl: item.thumbnailUrl,
      creator: item.creator,
      savedAt: new Date().toISOString()
    }
  ];
}

export function ArtistMediaBrowser({ artist }: ArtistMediaBrowserProps) {
  const defaultTab: ArtistTab = artist.discipline === 'Composer' ? 'music' : 'gallery';

  const [activeTab, setActiveTab] = useState<ArtistTab>(defaultTab);
  const [images, setImages] = useState<PublicMediaItem[]>([]);
  const [audioTracks, setAudioTracks] = useState<PublicMediaItem[]>([]);
  const [imageStatus, setImageStatus] = useState<MediaStatus>('idle');
  const [audioStatus, setAudioStatus] = useState<MediaStatus>('idle');
  const [imageExhausted, setImageExhausted] = useState(true);
  const [audioExhausted, setAudioExhausted] = useState(true);
  const [loadedTabs, setLoadedTabs] = useState({ gallery: false, music: false });
  const [imageFavorites, setImageFavorites] = useState<FavoriteMediaRecord[]>([]);
  const [audioFavorites, setAudioFavorites] = useState<FavoriteMediaRecord[]>([]);
  const [showGalleryFavoritesOnly, setShowGalleryFavoritesOnly] = useState(false);
  const [showMusicFavoritesOnly, setShowMusicFavoritesOnly] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTab);
    setImages([]);
    setAudioTracks([]);
    setImageStatus('idle');
    setAudioStatus('idle');
    setImageExhausted(true);
    setAudioExhausted(true);
    setLoadedTabs({ gallery: false, music: false });
    setShowGalleryFavoritesOnly(false);
    setShowMusicFavoritesOnly(false);

    const raw = localStorage.getItem(buildFavoritesStorageKey(artist.slug));
    if (!raw) {
      setImageFavorites([]);
      setAudioFavorites([]);
      return;
    }

    const parsed = parseArtistFavorites(raw);
    setImageFavorites(parsed.image);
    setAudioFavorites(parsed.audio);
  }, [artist.slug, defaultTab]);

  useEffect(() => {
    localStorage.setItem(
      buildFavoritesStorageKey(artist.slug),
      stringifyArtistFavorites({
        version: 2,
        image: imageFavorites,
        audio: audioFavorites
      })
    );
  }, [artist.slug, imageFavorites, audioFavorites]);

  const loadGallery = useCallback(async () => {
    if (loadedTabs.gallery || imageStatus === 'loading') {
      return;
    }
    setImageStatus('loading');
    try {
      const payload = await loadMedia(artist.slug, 'image');
      setImages(payload.items);
      setImageExhausted(payload.exhausted);
      setImageStatus('ready');
      setLoadedTabs((prev) => ({ ...prev, gallery: true }));
    } catch {
      setImageStatus('error');
    }
  }, [artist.slug, imageStatus, loadedTabs.gallery]);

  const loadMusic = useCallback(async () => {
    if (loadedTabs.music || audioStatus === 'loading') {
      return;
    }
    setAudioStatus('loading');
    try {
      const payload = await loadMedia(artist.slug, 'audio');
      setAudioTracks(payload.items);
      setAudioExhausted(payload.exhausted);
      setAudioStatus('ready');
      setLoadedTabs((prev) => ({ ...prev, music: true }));
    } catch {
      setAudioStatus('error');
    }
  }, [artist.slug, audioStatus, loadedTabs.music]);

  useEffect(() => {
    if (activeTab === 'gallery') {
      void loadGallery();
    }
    if (activeTab === 'music') {
      void loadMusic();
    }
  }, [activeTab, loadGallery, loadMusic]);

  useEffect(() => {
    if (activeTab === 'gallery' && loadedTabs.gallery && !loadedTabs.music && audioStatus === 'idle') {
      return scheduleIdleTask(() => {
        void loadMusic();
      });
    }

    if (activeTab === 'music' && loadedTabs.music && !loadedTabs.gallery && imageStatus === 'idle') {
      return scheduleIdleTask(() => {
        void loadGallery();
      });
    }

    return undefined;
  }, [activeTab, audioStatus, imageStatus, loadedTabs.gallery, loadedTabs.music, loadGallery, loadMusic]);

  const filteredImages = useMemo(
    () => (showGalleryFavoritesOnly ? images.filter((item) => hasFavorite(imageFavorites, item.mediaUrl)) : images),
    [images, imageFavorites, showGalleryFavoritesOnly]
  );

  const filteredAudio = useMemo(
    () => (showMusicFavoritesOnly ? audioTracks.filter((item) => hasFavorite(audioFavorites, item.mediaUrl)) : audioTracks),
    [audioFavorites, audioTracks, showMusicFavoritesOnly]
  );

  const tabClass = (tab: ArtistTab) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold ${
      activeTab === tab
        ? 'border-river bg-river text-white'
        : 'border-ink/20 text-ink hover:border-river dark:border-white/20 dark:text-white'
    }`;

  return (
    <div className="space-y-8">
      <Card className="space-y-3 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-river">Artist Media</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tabClass('overview')} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button type="button" className={tabClass('gallery')} onClick={() => setActiveTab('gallery')}>
            Gallery
          </button>
          <button type="button" className={tabClass('music')} onClick={() => setActiveTab('music')}>
            Music
          </button>
        </div>
      </Card>

      {activeTab === 'overview' ? (
        <section className="space-y-4">
          <SectionTitle title="Media Overview" subtitle="Use tabs to load and explore public-domain records" />
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Discipline</p>
              <p className="mt-1 text-lg font-semibold text-ink dark:text-white">{artist.discipline}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Artwork Loaded</p>
              <p className="mt-1 text-lg font-semibold text-ink dark:text-white">{images.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Audio Loaded</p>
              <p className="mt-1 text-lg font-semibold text-ink dark:text-white">{audioTracks.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/60 dark:text-white/60">Favorites</p>
              <p className="mt-1 text-lg font-semibold text-ink dark:text-white">{imageFavorites.length + audioFavorites.length}</p>
            </Card>
          </div>

          <Card className="space-y-3 p-4">
            <p className="text-sm text-ink/80 dark:text-white/80">
              The app preloads the non-active media tab during browser idle time and stores favorites per artist in local storage.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setActiveTab('gallery')}>
                Open gallery tab
              </Button>
              <Button type="button" variant="secondary" onClick={() => setActiveTab('music')}>
                Open music tab
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === 'gallery' ? (
        <section className="space-y-3">
          <SectionTitle title="Public Artwork Gallery" subtitle="Public-domain images discovered from Wikimedia Commons" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowGalleryFavoritesOnly((prev) => !prev)}>
              {showGalleryFavoritesOnly ? 'Show all artwork' : 'Show favorites only'}
            </Button>
            <p className="text-xs text-ink/70 dark:text-white/70">Favorites: {imageFavorites.length}</p>
          </div>
          {imageStatus === 'loading' ? (
            <p aria-live="polite" className="text-sm text-ink/70 dark:text-white/70">
              Loading gallery...
            </p>
          ) : null}
          {imageStatus === 'error' ? (
            <p className="text-sm text-ink/70 dark:text-white/70">Gallery source is unavailable right now. Try again shortly.</p>
          ) : null}
          {imageStatus === 'ready' && filteredImages.length === 0 ? (
            <p className="text-sm text-ink/70 dark:text-white/70">No artwork matches the current selection.</p>
          ) : null}
          {imageStatus === 'ready' ? (
            <p className="text-sm text-ink/70 dark:text-white/70">
              Loaded {images.length} public-domain artwork items.
              {!imageExhausted ? ' Source has additional paginated results beyond current load cap.' : ''}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredImages.map((item) => {
              const isFavorite = hasFavorite(imageFavorites, item.mediaUrl);
              return (
                <Card key={item.id} className="overflow-hidden">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      width={640}
                      height={440}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-44 w-full bg-ink/5 dark:bg-white/10" />
                  )}
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-ink dark:text-white">{item.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <Tag>{item.license}</Tag>
                      {isFavorite ? <Tag active>Favorite</Tag> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setImageFavorites((prev) => upsertFavorite(prev, item))}>
                        {isFavorite ? 'Remove favorite' : 'Save favorite'}
                      </Button>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-river underline-offset-2 hover:underline">
                        Open source record
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'music' ? (
        <section className="space-y-3">
          <SectionTitle title="Public Music Listening" subtitle="Public-domain classical audio discovered from Wikimedia Commons" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowMusicFavoritesOnly((prev) => !prev)}>
              {showMusicFavoritesOnly ? 'Show all tracks' : 'Show favorites only'}
            </Button>
            <p className="text-xs text-ink/70 dark:text-white/70">Favorites: {audioFavorites.length}</p>
          </div>
          {audioStatus === 'loading' ? (
            <p aria-live="polite" className="text-sm text-ink/70 dark:text-white/70">
              Loading audio tracks...
            </p>
          ) : null}
          {audioStatus === 'error' ? (
            <p className="text-sm text-ink/70 dark:text-white/70">Audio source is unavailable right now. Try again shortly.</p>
          ) : null}
          {audioStatus === 'ready' && filteredAudio.length === 0 ? (
            <p className="text-sm text-ink/70 dark:text-white/70">No audio matches the current selection.</p>
          ) : null}
          {audioStatus === 'ready' ? (
            <p className="text-sm text-ink/70 dark:text-white/70">
              Loaded {audioTracks.length} public-domain audio items.
              {!audioExhausted ? ' Source has additional paginated results beyond current load cap.' : ''}
            </p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredAudio.map((item) => {
              const isFavorite = hasFavorite(audioFavorites, item.mediaUrl);
              return (
                <Card key={item.id} className="space-y-3 p-4">
                  <p className="text-sm font-semibold text-ink dark:text-white">{item.title}</p>
                  <audio controls preload="none" className="w-full">
                    <source src={item.mediaUrl} />
                    Your browser does not support audio playback.
                  </audio>
                  <div className="flex flex-wrap gap-2">
                    <Tag>{item.license}</Tag>
                    {isFavorite ? <Tag active>Favorite</Tag> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setAudioFavorites((prev) => upsertFavorite(prev, item))}>
                      {isFavorite ? 'Remove favorite' : 'Save favorite'}
                    </Button>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-river underline-offset-2 hover:underline">
                      Open source record
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
