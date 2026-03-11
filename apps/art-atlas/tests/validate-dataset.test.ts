import assert from 'node:assert/strict';
import test from 'node:test';
import dataset from '../data/bingham.json';
import { validateDataset } from '../lib/validate-dataset';
import type { AtlasDataset } from '../lib/types';

test('valid dataset passes schema validation', async () => {
  await validateDataset(dataset as AtlasDataset, { checkRemote: false });
});

test('duplicate slug fails validation', async () => {
  const broken = structuredClone(dataset) as AtlasDataset;
  broken.artworks[1].slug = broken.artworks[0].slug;

  await assert.rejects(async () => {
    await validateDataset(broken, { checkRemote: false });
  }, /Duplicate slug/);
});

test('https URL requirement is enforced', async () => {
  const broken = structuredClone(dataset) as AtlasDataset;
  broken.artworks[0].sourceUrl = 'http://example.com/not-https';

  await assert.rejects(async () => {
    await validateDataset(broken, { checkRemote: false });
  }, /Source URL must be https/);
});

test('future lastVerified fails validation', async () => {
  const broken = structuredClone(dataset) as AtlasDataset;
  broken.artworks[0].lastVerified = '2099-01-01';

  await assert.rejects(async () => {
    await validateDataset(broken, { checkRemote: false });
  }, /lastVerified cannot be in the future/);
});
