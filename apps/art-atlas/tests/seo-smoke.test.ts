import assert from 'node:assert/strict';
import test from 'node:test';
import { artistDirectory } from '../lib/artists';
import { eras } from '../lib/eras';
import { movements } from '../lib/movements';
import robots from '../app/robots';
import sitemap from '../app/sitemap';

test('robots includes sitemap', () => {
  const config = robots();
  const sitemapValue = Array.isArray(config.sitemap) ? config.sitemap[0] : config.sitemap;
  assert.equal(typeof sitemapValue, 'string');
  assert.match(sitemapValue ?? '', /sitemap\.xml$/);
});

test('sitemap includes required top-level routes', () => {
  const entries = sitemap();
  const urls = new Set(entries.map((entry) => entry.url));
  const required = ['/', '/artists', '/collection', '/gallery', '/timeline', '/sources'].map((path) => `https://bingham-atlas.example${path === '/' ? '' : path}`);

  for (const url of required) {
    assert.equal(urls.has(url), true, `Missing sitemap URL: ${url}`);
  }
});

test('sitemap includes artist detail entries', () => {
  const entries = sitemap();
  const urls = new Set(entries.map((entry) => entry.url));
  const sample = artistDirectory.slice(0, 5);

  for (const artist of sample) {
    const url = `https://bingham-atlas.example/artists/${artist.slug}`;
    assert.equal(urls.has(url), true, `Missing artist URL: ${url}`);
  }
});

test('sitemap includes era and movement entries', () => {
  const entries = sitemap();
  const urls = new Set(entries.map((entry) => entry.url));

  const eraUrl = `https://bingham-atlas.example/eras/${eras[0].slug}`;
  const movementUrl = `https://bingham-atlas.example/movements/${movements[0].slug}`;

  assert.equal(urls.has(eraUrl), true, `Missing era URL: ${eraUrl}`);
  assert.equal(urls.has(movementUrl), true, `Missing movement URL: ${movementUrl}`);
});
