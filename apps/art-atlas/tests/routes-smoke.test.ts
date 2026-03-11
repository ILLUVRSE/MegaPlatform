import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('required route files exist', () => {
  const required = [
    'app/page.tsx',
    'app/artists/page.tsx',
    'app/artists/[slug]/page.tsx',
    'app/collection/page.tsx',
    'app/eras/[slug]/page.tsx',
    'app/movements/[slug]/page.tsx',
    'app/gallery/page.tsx',
    'app/artwork/[slug]/page.tsx',
    'app/timeline/page.tsx',
    'app/sources/page.tsx'
  ];

  for (const routeFile of required) {
    const fullPath = path.join(process.cwd(), routeFile);
    assert.equal(fs.existsSync(fullPath), true, `Missing route file: ${routeFile}`);
  }
});

test('gallery route module exposes default export', async () => {
  const mod = await import('../app/gallery/page');
  assert.equal(typeof mod.default, 'function');
});
