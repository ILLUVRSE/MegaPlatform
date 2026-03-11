import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

describe('thumbnail render script', () => {
  it('outputs required shipping assets', () => {
    if (hasFfmpeg()) {
      execSync('node scripts/render-thumbnails.mjs', { stdio: 'pipe' });
    }

    const cwd = process.cwd();
    const required = ['public/og-image.png', 'public/thumbnail-720x468.png', 'public/video-thumb-275x157.mp4'];

    for (const rel of required) {
      expect(fs.existsSync(path.join(cwd, rel))).toBe(true);
    }
  });
});
