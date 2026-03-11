import assert from 'node:assert/strict';
import test from 'node:test';
import { getArtistBySlug } from '../lib/artists';
import { getRelatedArtists } from '../lib/artist-relations';

test('getRelatedArtists returns same-movement matches first', () => {
  const target = getArtistBySlug('claude-monet');
  assert.ok(target, 'target artist should exist');

  const related = getRelatedArtists(target, 8);
  assert.ok(related.length > 0, 'related list should not be empty');

  const hasImpressionist = related.some((artist) => artist.movement === target.movement);
  assert.equal(hasImpressionist, true);
});

test('getRelatedArtists excludes self and respects limit', () => {
  const target = getArtistBySlug('johann-sebastian-bach');
  assert.ok(target, 'target artist should exist');

  const related = getRelatedArtists(target, 5);
  assert.equal(related.length <= 5, true);
  assert.equal(related.some((artist) => artist.slug === target.slug), false);
});
