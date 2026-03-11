import assert from 'node:assert/strict';
import test from 'node:test';
import { rankPublicMediaItems } from '../lib/media-ranking';
import type { PublicMediaItem } from '../lib/public-media';

let autoId = 0;

function makeImage(overrides: Partial<PublicMediaItem>): PublicMediaItem {
  return {
    id: overrides.id ?? `auto-${autoId++}`,
    title: overrides.title ?? 'untitled',
    creator: overrides.creator ?? 'Unknown creator',
    mediaUrl: overrides.mediaUrl ?? 'https://example.com/a.jpg',
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    sourceUrl: overrides.sourceUrl ?? 'https://example.com/source',
    license: overrides.license ?? 'Public domain',
    kind: 'image',
    width: overrides.width,
    height: overrides.height,
    description: overrides.description,
    captureDate: overrides.captureDate,
    categories: overrides.categories
  };
}

test('rankPublicMediaItems favors high-quality featured records', () => {
  const low = makeImage({
    id: 'low',
    title: 'Low',
    mediaUrl: 'https://example.com/low.jpg',
    width: 200,
    height: 150,
    creator: 'Unknown creator'
  });

  const high = makeImage({
    id: 'high',
    title: 'High',
    mediaUrl: 'https://example.com/high.jpg',
    width: 3000,
    height: 2200,
    creator: 'Claude Monet',
    description: 'Sunrise view',
    captureDate: '1889',
    categories: ['Featured pictures']
  });

  const ranked = rankPublicMediaItems([low, high]);
  assert.equal(ranked[0].id, 'high');
});

test('rankPublicMediaItems is deterministic for equal-score items', () => {
  const first = makeImage({
    id: '1',
    title: 'A Title',
    mediaUrl: 'https://example.com/a.jpg',
    width: 1000,
    height: 1000,
    creator: 'artist'
  });
  const second = makeImage({
    id: '2',
    title: 'B Title',
    mediaUrl: 'https://example.com/b.jpg',
    width: 1000,
    height: 1000,
    creator: 'artist'
  });

  const one = rankPublicMediaItems([second, first]).map((item) => item.id);
  const two = rankPublicMediaItems([first, second]).map((item) => item.id);

  assert.deepEqual(one, two);
  assert.deepEqual(one, ['1', '2']);
});

test('rankPublicMediaItems penalizes unknown tiny media', () => {
  const tinyUnknown = makeImage({
    id: 'tiny',
    title: 'Tiny',
    mediaUrl: 'https://example.com/tiny.jpg',
    width: 120,
    height: 120,
    creator: 'Unknown creator',
    license: 'Unknown'
  });

  const solid = makeImage({
    id: 'solid',
    title: 'Solid',
    mediaUrl: 'https://example.com/solid.jpg',
    width: 1200,
    height: 900,
    creator: 'Known',
    description: 'Complete metadata',
    captureDate: '1901',
    categories: ['Quality images']
  });

  const ranked = rankPublicMediaItems([tinyUnknown, solid]);
  assert.equal(ranked[ranked.length - 1].id, 'tiny');
});
