import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('icon build pipeline', () => {
  it('has generated sprite and manifest outputs', () => {
    const cwd = process.cwd();
    const spritePath = path.join(cwd, 'public/icons/sprite.svg');
    const manifestPath = path.join(cwd, 'src/assets/icons/manifest.json');
    expect(fs.existsSync(spritePath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest['pixelpuck']).toBe('icon-pixelpuck');
    expect(manifest['settings']).toBe('icon-settings');
  });
});
