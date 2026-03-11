import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const publicDir = path.join(cwd, 'public');
const tmpDir = path.join(cwd, '.tmp', 'marketing');

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function writeSvg(filePath, width, height, title, subtitle, accentShift) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#081620"/>
      <stop offset="1" stop-color="#113247"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#36E0B5"/>
      <stop offset="1" stop-color="#1B84FF"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${Math.round(width * (0.22 + accentShift))}" cy="${Math.round(height * 0.2)}" r="${Math.round(height * 0.23)}" fill="rgba(27,132,255,0.26)"/>
  <circle cx="${Math.round(width * (0.8 - accentShift))}" cy="${Math.round(height * 0.9)}" r="${Math.round(height * 0.27)}" fill="rgba(54,224,181,0.22)"/>
  <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.12)}" width="${Math.round(width * 0.14)}" height="${Math.round(height * 0.76)}" rx="${Math.round(height * 0.05)}" fill="#0E1C2A"/>
  <path d="M${Math.round(width * 0.09)} ${Math.round(height * 0.26)}h${Math.round(width * 0.08)}v${Math.round(height * 0.05)}h-${Math.round(width * 0.06)}v${Math.round(height * 0.06)}h${Math.round(width * 0.05)}v${Math.round(height * 0.05)}h-${Math.round(width * 0.05)}v${Math.round(height * 0.09)}h${Math.round(width * 0.06)}v${Math.round(height * 0.05)}h-${Math.round(width * 0.08)}z" fill="url(#accent)"/>
  <circle cx="${Math.round(width * 0.17)}" cy="${Math.round(height * 0.26)}" r="${Math.round(height * 0.025)}" fill="#36E0B5"/>
  <text x="${Math.round(width * 0.25)}" y="${Math.round(height * 0.42)}" fill="#EAF6FF" font-family="Trebuchet MS, Segoe UI, sans-serif" font-weight="700" font-size="${Math.round(height * 0.145)}">${title}</text>
  <text x="${Math.round(width * 0.25)}" y="${Math.round(height * 0.56)}" fill="#A6C9DC" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="${Math.round(height * 0.07)}">${subtitle}</text>
  <rect x="${Math.round(width * 0.25)}" y="${Math.round(height * 0.63)}" width="${Math.round(width * 0.31)}" height="${Math.round(height * 0.12)}" rx="${Math.round(height * 0.04)}" fill="rgba(54,224,181,0.2)" stroke="#36E0B5"/>
  <text x="${Math.round(width * 0.29)}" y="${Math.round(height * 0.71)}" fill="#CFFFF1" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="${Math.round(height * 0.058)}">12 SPORTS · PARTY READY</text>
</svg>\n`;
  fs.writeFileSync(filePath, svg);
}

function renderSvgToPng(svgPath, pngPath, width, height) {
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', svgPath, '-vf', `scale=${width}:${height}`, '-frames:v', '1', pngPath]);
}

function buildMarketingImages() {
  fs.mkdirSync(tmpDir, { recursive: true });
  writeSvg(path.join(tmpDir, 'og-image.svg'), 1200, 630, 'GameGrid', 'Digital sports bar portal', 0.0);
  writeSvg(path.join(tmpDir, 'thumb.svg'), 720, 468, 'GameGrid', 'Instant arcade sports', 0.06);
  renderSvgToPng(path.join(tmpDir, 'og-image.svg'), path.join(publicDir, 'og-image.png'), 1200, 630);
  renderSvgToPng(path.join(tmpDir, 'thumb.svg'), path.join(publicDir, 'thumbnail-720x468.png'), 720, 468);
}

function buildPreviewVideo() {
  const frameDir = path.join(tmpDir, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });
  for (let i = 0; i < 24; i += 1) {
    const shift = Math.sin((i / 24) * Math.PI * 2) * 0.05;
    const svgFile = path.join(frameDir, `frame-${String(i).padStart(2, '0')}.svg`);
    const pngFile = path.join(frameDir, `frame-${String(i).padStart(2, '0')}.png`);
    writeSvg(svgFile, 275, 157, 'GameGrid', 'Preview', shift);
    renderSvgToPng(svgFile, pngFile, 275, 157);
  }
  run('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '12',
    '-i',
    path.join(frameDir, 'frame-%02d.png'),
    '-c:v',
    'mpeg4',
    '-q:v',
    '8',
    '-movflags',
    '+faststart',
    path.join(publicDir, 'video-thumb-275x157.mp4')
  ]);
}

function buildIconRasterSet() {
  const faviconSvg = path.join(publicDir, 'favicon.svg');
  const sizes = [16, 32, 48, 180, 192, 512];
  for (const size of sizes) {
    renderSvgToPng(faviconSvg, path.join(publicDir, `favicon-${size}.png`), size, size);
  }
  renderSvgToPng(faviconSvg, path.join(publicDir, 'icon-192.png'), 192, 192);
  renderSvgToPng(faviconSvg, path.join(publicDir, 'icon-512.png'), 512, 512);
  renderSvgToPng(faviconSvg, path.join(publicDir, 'icon-192-maskable.png'), 192, 192);
  renderSvgToPng(faviconSvg, path.join(publicDir, 'icon-512-maskable.png'), 512, 512);
}

function ensureVideoUnder1Mb() {
  const file = path.join(publicDir, 'video-thumb-275x157.mp4');
  const bytes = fs.statSync(file).size;
  if (bytes > 1_000_000) {
    throw new Error(`Generated video ${bytes} bytes exceeds 1MB limit.`);
  }
}

function main() {
  fs.mkdirSync(publicDir, { recursive: true });
  buildMarketingImages();
  buildPreviewVideo();
  buildIconRasterSet();
  ensureVideoUnder1Mb();
  console.log('Rendered marketing assets to /public.');
}

main();
