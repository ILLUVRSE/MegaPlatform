import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArtistFavorites } from '../lib/favorites';

test('parseArtistFavorites migrates legacy url arrays', () => {
  const parsed = parseArtistFavorites(
    JSON.stringify({
      image: ['https://example.com/a.jpg'],
      audio: ['https://example.com/a.mp3']
    })
  );

  assert.equal(parsed.version, 2);
  assert.equal(parsed.image.length, 1);
  assert.equal(parsed.audio.length, 1);
  assert.equal(parsed.image[0].mediaUrl, 'https://example.com/a.jpg');
});

test('parseArtistFavorites keeps v2 metadata fields', () => {
  const parsed = parseArtistFavorites(
    JSON.stringify({
      version: 2,
      image: [
        {
          mediaUrl: 'https://example.com/a.jpg',
          title: 'Test',
          sourceUrl: 'https://example.com/src',
          license: 'Public domain'
        }
      ],
      audio: []
    })
  );

  assert.equal(parsed.image[0].title, 'Test');
  assert.equal(parsed.image[0].license, 'Public domain');
});
